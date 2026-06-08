module volara::liquidity_pool {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::table::{Self, Table};
    use sui::event;

    // ===== Errors =====
    const EInsufficientBalance: u64 = 0;
    const EInsufficientShares: u64 = 1;
    const EZeroAmount: u64 = 2;
    const EPoolEmpty: u64 = 3;
    const EPoolUtilizationExceeded: u64 = 4;
    const ENotAdmin: u64 = 5;
    const EPoolPaused: u64 = 6;

    // ===== Constants =====
    const MAX_UTILIZATION_BPS: u64 = 7000; // 70% max utilization

    // ===== Events =====
    public struct DepositEvent has copy, drop {
        depositor: address,
        amount: u64,
        shares_minted: u64,
    }

    public struct WithdrawEvent has copy, drop {
        withdrawer: address,
        amount: u64,
        shares_burned: u64,
    }

    public struct PauseEvent has copy, drop {
        paused: bool,
        admin: address,
    }

    // ===== Structs =====
    public struct LiquidityPool has key {
        id: UID,
        balance: Balance<SUI>,
        total_shares: u64,
        total_premiums_collected: u64,
        total_exposure: u64, // tracks open interest
        lp_shares: Table<address, u64>,
        admin: address,
        paused: bool,
    }

    public struct AdminCap has key, store {
        id: UID,
    }

    // ===== Init =====
    fun init(ctx: &mut TxContext) {
        let admin_cap = AdminCap { id: object::new(ctx) };
        let pool = LiquidityPool {
            id: object::new(ctx),
            balance: balance::zero<SUI>(),
            total_shares: 0,
            total_premiums_collected: 0,
            total_exposure: 0,
            lp_shares: table::new(ctx),
            admin: tx_context::sender(ctx),
            paused: false,
        };
        transfer::share_object(pool);
        transfer::transfer(admin_cap, tx_context::sender(ctx));
    }

    // ===== Admin Functions =====

    /// Emergency pause — only admin
    public entry fun set_paused(
        pool: &mut LiquidityPool,
        _cap: &AdminCap,
        paused: bool,
        ctx: &mut TxContext
    ) {
        pool.paused = paused;
        event::emit(PauseEvent {
            paused,
            admin: tx_context::sender(ctx),
        });
    }

    /// Withdraw protocol fees — only admin
    public entry fun withdraw_fees(
        pool: &mut LiquidityPool,
        _cap: &AdminCap,
        amount: u64,
        ctx: &mut TxContext
    ) {
        assert!(!pool.paused, EPoolPaused);
        assert!(balance::value(&pool.balance) >= amount, EInsufficientBalance);
        let fee_coin = coin::from_balance(balance::split(&mut pool.balance, amount), ctx);
        transfer::public_transfer(fee_coin, pool.admin);
    }

    // ===== Public Functions =====

    public entry fun deposit(
        pool: &mut LiquidityPool,
        coin: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        assert!(!pool.paused, EPoolPaused);
        let amount = coin::value(&coin);
        assert!(amount > 0, EZeroAmount);

        let shares_to_mint = if (pool.total_shares == 0 || balance::value(&pool.balance) == 0) {
            amount
        } else {
            (amount * pool.total_shares) / balance::value(&pool.balance)
        };

        let depositor = tx_context::sender(ctx);
        balance::join(&mut pool.balance, coin::into_balance(coin));
        pool.total_shares = pool.total_shares + shares_to_mint;

        if (table::contains(&pool.lp_shares, depositor)) {
            let current = table::borrow_mut(&mut pool.lp_shares, depositor);
            *current = *current + shares_to_mint;
        } else {
            table::add(&mut pool.lp_shares, depositor, shares_to_mint);
        };

        event::emit(DepositEvent {
            depositor,
            amount,
            shares_minted: shares_to_mint,
        });
    }

    public entry fun withdraw(
        pool: &mut LiquidityPool,
        shares_amount: u64,
        ctx: &mut TxContext
    ) {
        assert!(!pool.paused, EPoolPaused);
        let sender = tx_context::sender(ctx);
        assert!(table::contains(&pool.lp_shares, sender), EInsufficientShares);

        let user_shares = *table::borrow(&pool.lp_shares, sender);
        assert!(user_shares >= shares_amount, EInsufficientShares);
        assert!(pool.total_shares > 0, EPoolEmpty);

        let pool_balance = balance::value(&pool.balance);
        let amount_to_withdraw = (shares_amount * pool_balance) / pool.total_shares;
        assert!(amount_to_withdraw > 0, EZeroAmount);

        let shares_ref = table::borrow_mut(&mut pool.lp_shares, sender);
        *shares_ref = *shares_ref - shares_amount;
        pool.total_shares = pool.total_shares - shares_amount;

        let withdrawn = balance::split(&mut pool.balance, amount_to_withdraw);
        transfer::public_transfer(coin::from_balance(withdrawn, ctx), sender);

        event::emit(WithdrawEvent {
            withdrawer: sender,
            amount: amount_to_withdraw,
            shares_burned: shares_amount,
        });
    }

    // ===== Utilization Check =====

    /// Check if new exposure would exceed utilization cap
    public fun check_utilization(pool: &LiquidityPool, new_exposure: u64) {
        let bal = balance::value(&pool.balance);
        if (bal == 0) { return };
        let projected = pool.total_exposure + new_exposure;
        let utilization_bps = (projected * 10000) / bal;
        assert!(utilization_bps <= MAX_UTILIZATION_BPS, EPoolUtilizationExceeded);
    }

    /// Add exposure when option is bought
    public(package) fun add_exposure(pool: &mut LiquidityPool, amount: u64) {
        pool.total_exposure = pool.total_exposure + amount;
    }

    /// Remove exposure when option is settled or closed
    public(package) fun remove_exposure(pool: &mut LiquidityPool, amount: u64) {
        if (amount > pool.total_exposure) {
            pool.total_exposure = 0;
        } else {
            pool.total_exposure = pool.total_exposure - amount;
        }
    }

    // ===== Getters =====

    public fun get_pool_balance(pool: &LiquidityPool): u64 {
        balance::value(&pool.balance)
    }

    public fun get_lp_share(pool: &LiquidityPool, addr: address): u64 {
        if (table::contains(&pool.lp_shares, addr)) {
            *table::borrow(&pool.lp_shares, addr)
        } else {
            0
        }
    }

    public fun get_total_shares(pool: &LiquidityPool): u64 {
        pool.total_shares
    }

    public fun get_total_exposure(pool: &LiquidityPool): u64 {
        pool.total_exposure
    }

    public fun is_paused(pool: &LiquidityPool): bool {
        pool.paused
    }

    public fun get_utilization_bps(pool: &LiquidityPool): u64 {
        let bal = balance::value(&pool.balance);
        if (bal == 0) { return 0 };
        (pool.total_exposure * 10000) / bal
    }

    // ===== Internal =====

    public(package) fun pay_out(
        pool: &mut LiquidityPool,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        assert!(balance::value(&pool.balance) >= amount, EInsufficientBalance);
        let payout = balance::split(&mut pool.balance, amount);
        transfer::public_transfer(coin::from_balance(payout, ctx), recipient);
        // Reduce exposure when paying out
        remove_exposure(pool, amount);
    }

    public(package) fun collect_premium(pool: &mut LiquidityPool, coin: Coin<SUI>) {
        assert!(!pool.paused, EPoolPaused);
        let amount = coin::value(&coin);
        pool.total_premiums_collected = pool.total_premiums_collected + amount;
        balance::join(&mut pool.balance, coin::into_balance(coin));
    }
}
