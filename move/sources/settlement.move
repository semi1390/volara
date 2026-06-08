module volara::settlement {
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

    // ===== Structs =====
    public struct LiquidityPool has key {
        id: UID,
        balance: Balance<SUI>,
        total_shares: u64,
        total_premiums_collected: u64,
        lp_shares: Table<address, u64>,
        admin: address,
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
            lp_shares: table::new(ctx),
            admin: tx_context::sender(ctx),
        };
        transfer::share_object(pool);
        transfer::transfer(admin_cap, tx_context::sender(ctx));
    }

    // ===== Public Functions =====
    public entry fun deposit(
        pool: &mut LiquidityPool,
        coin: Coin<SUI>,
        ctx: &mut TxContext
    ) {
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

    // Internal: pay out from pool (called by settlement)
    public(package) fun pay_out(
        pool: &mut LiquidityPool,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        assert!(balance::value(&pool.balance) >= amount, EInsufficientBalance);
        let payout = balance::split(&mut pool.balance, amount);
        transfer::public_transfer(coin::from_balance(payout, ctx), recipient);
    }

    // Internal: collect premium into pool
    public(package) fun collect_premium(pool: &mut LiquidityPool, coin: Coin<SUI>) {
        let amount = coin::value(&coin);
        pool.total_premiums_collected = pool.total_premiums_collected + amount;
        balance::join(&mut pool.balance, coin::into_balance(coin));
    }
}
