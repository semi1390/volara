module volara::settlement {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::table::{Self, Table};
    use sui::clock::{Self, Clock};
    use volara::options::{Self, OptionPosition};
    use volara::liquidity_pool::{Self, LiquidityPool};
    use volara::fees;

    // ===== Errors =====
    const EOptionNotExpired: u64 = 0;
    const EAlreadySettled: u64 = 1;
    const ENoPayoutDue: u64 = 2;
    const ENotOwner: u64 = 3;
    const EInvalidPrice: u64 = 4;
    const EAlreadyRegistered: u64 = 5;
    const EPriceTooStale: u64 = 6;

    // ===== Constants =====
    const MAX_PRICE_AGE_MS: u64 = 300_000; // 5 minutes max staleness

    // ===== Events =====
    public struct SettlementEvent has copy, drop {
        option_id: ID,
        owner: address,
        settlement_price: u64,
        payout: u64,
        contract_size: u64,
        is_itm: bool,
    }

    public struct KeeperSettlementEvent has copy, drop {
        option_id: ID,
        owner: address,
        keeper: address,
        settlement_price: u64,
        payout: u64,
        contract_size: u64,
    }

    // ===== Structs =====
    public struct SettlementRegistry has key {
        id: UID,
        settled_options: Table<ID, u64>,
        total_settled: u64,
        total_payout: u64,
    }

    // ===== Init =====
    fun init(ctx: &mut TxContext) {
        let registry = SettlementRegistry {
            id: object::new(ctx),
            settled_options: table::new(ctx),
            total_settled: 0,
            total_payout: 0,
        };
        transfer::share_object(registry);
    }

    // ===== Public Functions =====

    /// Calculate payout — multiplied by contract_size for leverage
    public fun calculate_payout(
        option: &OptionPosition,
        settlement_price: u64
    ): u64 {
        let strike = options::get_strike_price(option);
        let qty = options::get_quantity(option);
        let contract_size = options::get_contract_size(option);
        let option_type = options::get_option_type(option);

        // Payout multiplied by contract_size — this is the leverage
        // CALL payout = max(0, settlement_price - strike) × qty × contract_size
        // PUT  payout = max(0, strike - settlement_price) × qty × contract_size
        if (option_type == options::call_type()) {
            if (settlement_price > strike) {
                (settlement_price - strike) * qty * contract_size
            } else {
                0
            }
        } else {
            if (strike > settlement_price) {
                (strike - settlement_price) * qty * contract_size
            } else {
                0
            }
        }
    }

    /// Settle by option owner — uses Clock for tamper-proof timestamp
    public entry fun settle_option(
        registry: &mut SettlementRegistry,
        pool: &mut LiquidityPool,
        option: OptionPosition,
        settlement_price: u64,
        price_timestamp_ms: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(settlement_price > 0, EInvalidPrice);
        assert!(!options::is_settled(&option), EAlreadySettled);

        let now_ms = clock::timestamp_ms(clock);
        let expiry_ms = options::get_expiry(&option) * 1000;
        assert!(now_ms >= expiry_ms, EOptionNotExpired);

        // Validate price freshness
        assert!(now_ms - price_timestamp_ms <= MAX_PRICE_AGE_MS, EPriceTooStale);

        let owner = options::get_owner(&option);
        let sender = tx_context::sender(ctx);
        assert!(owner == sender, ENotOwner);

        let option_id_ref = *sui::object::borrow_id(&option);
        assert!(!table::contains(&registry.settled_options, option_id_ref), EAlreadyRegistered);

        let contract_size = options::get_contract_size(&option);
        let payout = calculate_payout(&option, settlement_price);
        let is_itm = payout > 0;

        if (payout > 0) {
            let fee = fees::calculate_settlement_fee(payout);
            let net_payout = payout - fee;
            liquidity_pool::pay_out(pool, net_payout, owner, ctx);
            registry.settled_options.add(option_id_ref, net_payout);
            registry.total_payout = registry.total_payout + net_payout;
        } else {
            registry.settled_options.add(option_id_ref, 0);
        };

        registry.total_settled = registry.total_settled + 1;

        event::emit(SettlementEvent {
            option_id: option_id_ref,
            owner,
            settlement_price,
            payout,
            contract_size,
            is_itm,
        });

        options::destroy_option(option);
    }

    /// Keeper settlement — permissionless after expiry
    public entry fun keeper_settle(
        registry: &mut SettlementRegistry,
        pool: &mut LiquidityPool,
        option: OptionPosition,
        settlement_price: u64,
        price_timestamp_ms: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(settlement_price > 0, EInvalidPrice);
        assert!(!options::is_settled(&option), EAlreadySettled);

        let now_ms = clock::timestamp_ms(clock);
        let expiry_ms = options::get_expiry(&option) * 1000;
        assert!(now_ms >= expiry_ms, EOptionNotExpired);

        // Validate price freshness
        assert!(now_ms - price_timestamp_ms <= MAX_PRICE_AGE_MS, EPriceTooStale);

        let option_id_ref = *sui::object::borrow_id(&option);
        assert!(!table::contains(&registry.settled_options, option_id_ref), EAlreadyRegistered);

        let owner = options::get_owner(&option);
        let keeper = tx_context::sender(ctx);
        let contract_size = options::get_contract_size(&option);
        let payout = calculate_payout(&option, settlement_price);

        if (payout > 0) {
            let fee = fees::calculate_settlement_fee(payout);
            let net_payout = payout - fee;
            liquidity_pool::pay_out(pool, net_payout, owner, ctx);
            registry.settled_options.add(option_id_ref, net_payout);
            registry.total_payout = registry.total_payout + net_payout;
        } else {
            registry.settled_options.add(option_id_ref, 0);
        };

        registry.total_settled = registry.total_settled + 1;

        event::emit(KeeperSettlementEvent {
            option_id: option_id_ref,
            owner,
            keeper,
            settlement_price,
            payout,
            contract_size,
        });

        options::destroy_option(option);
    }

    // ===== Getters =====
    public fun get_total_settled(registry: &SettlementRegistry): u64 {
        registry.total_settled
    }

    public fun get_total_payout(registry: &SettlementRegistry): u64 {
        registry.total_payout
    }

    public fun has_been_settled(registry: &SettlementRegistry, option_id: ID): bool {
        table::contains(&registry.settled_options, option_id)
    }
}
