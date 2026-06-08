module volara::settlement {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::table::{Self, Table};
    use volara::options::{Self, OptionPosition};
    use volara::liquidity_pool::{Self, LiquidityPool};
    use volara::fees;

    // ===== Errors =====
    const EOptionNotExpired: u64 = 0;
    const EAlreadySettled: u64 = 1;
    const ENoPayoutDue: u64 = 2;
    const ENotOwner: u64 = 3;
    const EInvalidPrice: u64 = 4;

    // ===== Events =====
    public struct SettlementEvent has copy, drop {
        option_id: ID,
        owner: address,
        settlement_price: u64,
        payout: u64,
        is_itm: bool,
    }

    public struct BatchSettlementEvent has copy, drop {
        count: u64,
        total_payout: u64,
    }

    // ===== Structs =====
    public struct SettlementRegistry has key {
        id: UID,
        settled_options: Table<ID, u64>, // option_id -> payout
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

    /// Calculate payout for an option given settlement price
    public fun calculate_payout(
        option: &OptionPosition,
        settlement_price: u64
    ): u64 {
        let strike = options::get_strike_price(option);
        let qty = options::get_quantity(option);
        let option_type = options::get_option_type(option);

        // CALL payout = max(0, settlement_price - strike) * qty
        // PUT payout = max(0, strike - settlement_price) * qty
        if (option_type == options::call_type()) {
            if (settlement_price > strike) {
                (settlement_price - strike) * qty
            } else {
                0
            }
        } else {
            // PUT
            if (strike > settlement_price) {
                (strike - settlement_price) * qty
            } else {
                0
            }
        }
    }

    /// Settle a single option using a provided price (oracle price in production)
    public entry fun settle_option(
        registry: &mut SettlementRegistry,
        pool: &mut LiquidityPool,
        option: OptionPosition,
        settlement_price: u64,
        current_timestamp: u64,
        ctx: &mut TxContext
    ) {
        assert!(settlement_price > 0, EInvalidPrice);
        assert!(!options::is_settled(&option), EAlreadySettled);

        let expiry = options::get_expiry(&option);
        assert!(current_timestamp >= expiry, EOptionNotExpired);

        let owner = options::get_owner(&option);
        let sender = tx_context::sender(ctx);
        assert!(owner == sender, ENotOwner);

        let payout = calculate_payout(&option, settlement_price);
       let option_id_ref = *sui::object::borrow_id(&option);

        let is_itm = payout > 0;

        if (payout > 0) {
            // Deduct settlement fee
            let fee = fees::calculate_settlement_fee(payout);
            let net_payout = payout - fee;

            // Pay out from pool
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
            is_itm,
        });

        // Burn the option object
     options::destroy_option(option);
    }

    /// Claim payout for an already-settled option (alternative flow)
    public entry fun claim_payout(
        registry: &SettlementRegistry,
        pool: &mut LiquidityPool,
        option_id: ID,
        ctx: &mut TxContext
    ) {
        assert!(table::contains(&registry.settled_options, option_id), ENoPayoutDue);
        let payout = *table::borrow(&registry.settled_options, option_id);
        assert!(payout > 0, ENoPayoutDue);

        liquidity_pool::pay_out(pool, payout, tx_context::sender(ctx), ctx);
    }

    // Getters
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
