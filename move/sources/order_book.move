module volara::order_book {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::table::{Self, Table};

    // ===== Errors =====
    const EOrderNotFound: u64 = 0;
    const ENotOrderOwner: u64 = 1;
    const EOrderAlreadyCancelled: u64 = 2;
    const EInvalidPrice: u64 = 3;
    const EInvalidSize: u64 = 4;

    // ===== Events =====
    public struct OrderPlacedEvent has copy, drop {
        order_id: ID,
        placer: address,
        option_id: ID,
        price: u64,
        size: u64,
        is_bid: bool,
    }

    public struct OrderCancelledEvent has copy, drop {
        order_id: ID,
        owner: address,
    }

    public struct OrderMatchedEvent has copy, drop {
        bid_order_id: ID,
        ask_order_id: ID,
        matched_price: u64,
        matched_size: u64,
    }

    // ===== Structs =====
    public struct Order has key, store {
        id: UID,
        option_id: ID,
        price: u64,
        size: u64,
        remaining_size: u64,
        owner: address,
        is_bid: bool,
        is_active: bool,
        timestamp: u64,
    }

    public struct OrderBook has key {
        id: UID,
        bids: Table<ID, bool>,
        asks: Table<ID, bool>,
        total_orders: u64,
    }

    // ===== Init =====
    fun init(ctx: &mut TxContext) {
        let book = OrderBook {
            id: object::new(ctx),
            bids: table::new(ctx),
            asks: table::new(ctx),
            total_orders: 0,
        };
        transfer::share_object(book);
    }

    // ===== Public Functions =====
    public entry fun place_order(
        book: &mut OrderBook,
        option_id: ID,
        price: u64,
        size: u64,
        is_bid: bool,
        ctx: &mut TxContext
    ) {
        assert!(price > 0, EInvalidPrice);
        assert!(size > 0, EInvalidSize);

        let placer = tx_context::sender(ctx);
        let order_uid = object::new(ctx);
        let order_id = object::uid_to_inner(&order_uid);

        let order = Order {
            id: order_uid,
            option_id,
            price,
            size,
            remaining_size: size,
            owner: placer,
            is_bid,
            is_active: true,
            timestamp: 0, // Would use clock in production
        };

        if (is_bid) {
            table::add(&mut book.bids, order_id, true);
        } else {
            table::add(&mut book.asks, order_id, true);
        };

        book.total_orders = book.total_orders + 1;

        event::emit(OrderPlacedEvent {
            order_id,
            placer,
            option_id,
            price,
            size,
            is_bid,
        });

        transfer::share_object(order);
    }

    public entry fun cancel_order(
        book: &mut OrderBook,
        order: &mut Order,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(order.owner == sender, ENotOrderOwner);
        assert!(order.is_active, EOrderAlreadyCancelled);

        order.is_active = false;
        let order_id = object::uid_to_inner(&order.id);

        if (order.is_bid && table::contains(&book.bids, order_id)) {
            table::remove(&mut book.bids, order_id);
        } else if (!order.is_bid && table::contains(&book.asks, order_id)) {
            table::remove(&mut book.asks, order_id);
        };

        event::emit(OrderCancelledEvent {
            order_id,
            owner: sender,
        });
    }

    // Match orders (simplified - in production would be more sophisticated)
    public entry fun match_orders(
        _book: &mut OrderBook,
        bid: &mut Order,
        ask: &mut Order,
        _ctx: &mut TxContext
    ) {
        assert!(bid.is_bid && !ask.is_bid, EOrderNotFound);
        assert!(bid.is_active && ask.is_active, EOrderAlreadyCancelled);
        assert!(bid.price >= ask.price, EInvalidPrice);

        let matched_size = if (bid.remaining_size < ask.remaining_size) {
            bid.remaining_size
        } else {
            ask.remaining_size
        };

        let matched_price = ask.price;

        bid.remaining_size = bid.remaining_size - matched_size;
        ask.remaining_size = ask.remaining_size - matched_size;

      if (bid.remaining_size == 0) {
            bid.is_active = false;
        };
        if (ask.remaining_size == 0) {
            ask.is_active = false;
        };

        event::emit(OrderMatchedEvent {
            bid_order_id: object::uid_to_inner(&bid.id),
            ask_order_id: object::uid_to_inner(&ask.id),
            matched_price,
            matched_size,
        });
    }

    // Getters
    public fun get_total_orders(book: &OrderBook): u64 { book.total_orders }
    public fun is_order_active(order: &Order): bool { order.is_active }
    public fun get_order_price(order: &Order): u64 { order.price }
    public fun get_order_size(order: &Order): u64 { order.size }
    public fun get_order_remaining(order: &Order): u64 { order.remaining_size }
}
