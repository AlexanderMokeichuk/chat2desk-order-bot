-- Orders table
CREATE TABLE IF NOT EXISTS orders
(
    id
    SERIAL
    PRIMARY
    KEY,
    client_phone
    VARCHAR
(
    20
) NOT NULL,
    delivery_address TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK
(
    quantity >
    0
    AND
    quantity
    <=
    50
),
    source VARCHAR
(
    50
) NOT NULL DEFAULT 'chat2desk_bot',
    chat2desk_client_id VARCHAR
(
    255
),
    status VARCHAR
(
    50
) NOT NULL DEFAULT 'new',
    created_at TIMESTAMP DEFAULT NOW
(
),
    updated_at TIMESTAMP DEFAULT NOW
(
)
    );

CREATE INDEX idx_orders_created_at ON orders (created_at);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_chat2desk_client_id ON orders (chat2desk_client_id);

-- Message logs for analytics
CREATE TABLE IF NOT EXISTS message_logs
(
    id
    SERIAL
    PRIMARY
    KEY,
    client_id
    VARCHAR
(
    255
) NOT NULL,
    message_id VARCHAR
(
    255
) NOT NULL UNIQUE,
    text TEXT NOT NULL,
    dialog_state VARCHAR
(
    50
),
    timestamp BIGINT NOT NULL,
    success BOOLEAN DEFAULT TRUE,
    error_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW
(
)
    );

CREATE INDEX idx_message_logs_client_id ON message_logs (client_id);
CREATE INDEX idx_message_logs_timestamp ON message_logs (timestamp);
CREATE INDEX idx_message_logs_success ON message_logs (success);
CREATE INDEX idx_message_logs_created_at ON message_logs (created_at);

-- Dialog outcomes for conversion analysis
CREATE TABLE IF NOT EXISTS dialog_outcomes
(
    id
    SERIAL
    PRIMARY
    KEY,
    client_id
    VARCHAR
(
    255
) NOT NULL,
    completed BOOLEAN NOT NULL,
    dropoff_state VARCHAR
(
    50
),
    total_messages INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW
(
)
    );

CREATE INDEX idx_dialog_outcomes_completed ON dialog_outcomes (completed);
CREATE INDEX idx_dialog_outcomes_dropoff ON dialog_outcomes (dropoff_state);
CREATE INDEX idx_dialog_outcomes_created_at ON dialog_outcomes (created_at);

-- Success message
DO
$$
BEGIN
    RAISE
NOTICE 'Database initialized successfully!';
END $$;