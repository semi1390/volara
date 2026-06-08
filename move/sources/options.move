module volara::options {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use volara::liquidity_pool::{Self, LiquidityPool};
    use volara::fees;

    // ===== Constants =====
    const CALL: u8 = 0;
    const PUT: u8 = 1;

    // ===== Errors =====
    const EInvalidOptionType: u64 = 0;
    const EOptionExpired: u64 = 1;
    const EOptionNotExpired: u64 = 2;
    const EAlreadySettled: u64 = 3;
    const ENotOwner: u64 = 4;
    const EInsufficientPremium: u64 = 5;
    const EInvalidStrike: u64 = 6;
    const EInvalidQuantity: u64 = 7;

    // ===== Events =====
    public struct OptionBoughtEvent has copy, drop {
        option_id: ID,
        buyer: address,
        option_type: u8,
        strike_price: u64,
        expiry_timestamp: u64,
        premium_paid: u64,
        quantity: u64,
    }

    public struct PositionClosedEvent has copy, drop {
        option_id: ID,
        owner: address,
    }

    // ===== Structs =====
    public struct OptionPosition has key, store {
        id: UID,
        option_type: u8,
        strike_price: u64,
        expiry_timestamp: u64,
        premium_paid: u64,
        quantity: u64,
        owner: address,
        is_settled: bool,
        market: vector<u8>, // e.g. "SUI/USDC"
    }

    // ===== Public Functions =====
    public entry fun buy_option(
        pool: &mut LiquidityPool,
        option_type: u8,
        strike_price: u64,
        expiry_timestamp: u64,
        quantity: u64,
        market: vector<u8>,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        assert!(option_type == CALL || option_type == PUT, EInvalidOptionType);
        assert!(strike_price > 0, EInvalidStrike);
        assert!(quantity > 0, EInvalidQuantity);

        let payment_amount = coin::value(&payment);
        let fee = fees::calculate_fee(payment_amount);
        let premium = payment_amount - fee;
        assert!(premium > 0, EInsufficientPremium);

        // Split fee from payment
        let mut payment_mut = payment;
        let fee_coin = coin::split(&mut payment_mut, fee, ctx);
        fees::collect_fee_coin(fee_coin, ctx);

        // Rest goes to pool
        liquidity_pool::collect_premium(pool, payment_mut);

        let buyer = tx_context::sender(ctx);
        let option_id_obj = object::new(ctx);
        let option_id = object::uid_to_inner(&option_id_obj);

        let option = OptionPosition {
            id: option_id_obj,
            option_type,
            strike_price,
            expiry_timestamp,
            premium_paid: premium,
            quantity,
            owner: buyer,
            is_settled: false,
            market,
        };

        event::emit(OptionBoughtEvent {
            option_id,
            buyer,
            option_type,
            strike_price,
            expiry_timestamp,
            premium_paid: premium,
            quantity,
        });

        transfer::transfer(option, buyer);
    }

    public entry fun close_position(
        option: OptionPosition,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(option.owner == sender, ENotOwner);
        assert!(!option.is_settled, EAlreadySettled);

        let OptionPosition {
            id,
            option_type: _,
            strike_price: _,
            expiry_timestamp: _,
            premium_paid: _,
            quantity: _,
            owner,
            is_settled: _,
            market: _,
        } = option;

        event::emit(PositionClosedEvent {
            option_id: object::uid_to_inner(&id),
            owner,
        });

        object::delete(id);
    }

    // Getters
    public fun get_option_type(option: &OptionPosition): u8 { option.option_type }
    public fun get_strike_price(option: &OptionPosition): u64 { option.strike_price }
    public fun get_expiry(option: &OptionPosition): u64 { option.expiry_timestamp }
    public fun get_premium(option: &OptionPosition): u64 { option.premium_paid }
    public fun get_quantity(option: &OptionPosition): u64 { option.quantity }
    public fun get_owner(option: &OptionPosition): address { option.owner }
    public fun is_settled(option: &OptionPosition): bool { option.is_settled }
    public fun get_market(option: &OptionPosition): vector<u8> { option.market }

    public(package) fun mark_settled(option: &mut OptionPosition) {
        option.is_settled = true;
    }

    public fun call_type(): u8 { CALL }
    public fun put_type(): u8 { PUT }
    public(package) fun destroy_option(option: OptionPosition) {
    let OptionPosition { id, option_type: _, strike_price: _, expiry_timestamp: _, premium_paid: _, quantity: _, owner: _, is_settled: _, market: _ } = option;
    object::delete(id);
}
}
