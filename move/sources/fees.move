module volara::fees {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::event;

    // ===== Constants =====
    // 0.3% = 30 basis points
    const TRADE_FEE_BPS: u64 = 30;
    // 0.1% = 10 basis points
    const SETTLEMENT_FEE_BPS: u64 = 10;
    const BPS_DENOMINATOR: u64 = 10000;

    // Hardcoded admin for testnet
    const ADMIN_ADDRESS: address = @0x1;

    // ===== Errors =====
    const ENotAdmin: u64 = 0;
    const EInsufficientFees: u64 = 1;

    // ===== Events =====
    public struct FeeCollectedEvent has copy, drop {
        amount: u64,
        fee_type: u8, // 0=trade, 1=settlement
    }

    public struct TreasuryWithdrawEvent has copy, drop {
        amount: u64,
        recipient: address,
    }

    // ===== Structs =====
    public struct Treasury has key {
        id: UID,
        balance: Balance<SUI>,
        total_collected: u64,
        admin: address,
    }

    // ===== Init =====
    fun init(ctx: &mut TxContext) {
        let treasury = Treasury {
            id: object::new(ctx),
            balance: balance::zero<SUI>(),
            total_collected: 0,
            admin: tx_context::sender(ctx),
        };
        transfer::share_object(treasury);
    }

    // ===== Public Functions =====
    public fun calculate_fee(amount: u64): u64 {
        (amount * TRADE_FEE_BPS) / BPS_DENOMINATOR
    }

    public fun calculate_settlement_fee(amount: u64): u64 {
        (amount * SETTLEMENT_FEE_BPS) / BPS_DENOMINATOR
    }

    public entry fun collect_fee(
        treasury: &mut Treasury,
        coin: Coin<SUI>,
        _ctx: &mut TxContext
    ) {
        let amount = coin::value(&coin);
        treasury.total_collected = treasury.total_collected + amount;
        balance::join(&mut treasury.balance, coin::into_balance(coin));

        event::emit(FeeCollectedEvent {
            amount,
            fee_type: 0,
        });
    }

    // Called internally by options module
    public(package) fun collect_fee_coin(coin: Coin<SUI>, ctx: &mut TxContext) {
        // In production, send to treasury object
        // For simplicity in testnet, transfer to admin
        transfer::public_transfer(coin, tx_context::sender(ctx));
    }

    public entry fun withdraw_treasury(
        treasury: &mut Treasury,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == treasury.admin, ENotAdmin);
        assert!(balance::value(&treasury.balance) >= amount, EInsufficientFees);

        let withdrawn = balance::split(&mut treasury.balance, amount);
        transfer::public_transfer(coin::from_balance(withdrawn, ctx), sender);

        event::emit(TreasuryWithdrawEvent {
            amount,
            recipient: sender,
        });
    }

    // Getters
    public fun get_treasury_balance(treasury: &Treasury): u64 {
        balance::value(&treasury.balance)
    }

    public fun get_total_collected(treasury: &Treasury): u64 {
        treasury.total_collected
    }
}
