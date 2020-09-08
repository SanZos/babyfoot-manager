-- UP
CREATE TABLE migration (
    file VARCHAR(255) NOT NULL,
    up TEXT NOT NULL,
    down TEXT NOT NULL
);

CREATE TABLE partie (
    id SERIAL PRIMARY KEY NOT NULL,
    name VARCHAR(255) NOT NULL,
    finished BOOLEAN DEFAULT FALSE
);

-- DOWN
DROP TABLE partie;
DROP TABLE migration;