# PostgreSQL SSL Connection Fix for asyncpg

This document explains how we fixed SSL connection issues with PostgreSQL when deploying on Digital Ocean using the asyncpg driver.

## The Problem

When deploying to Digital Ocean App Platform with PostgreSQL database, we encountered the following error when using `ssl=true` or `sslmode=require` in the connection string:

```text
TypeError: connect() got an unexpected keyword argument 'sslmode'
```

This occurred because:

1. The asyncpg driver (used with `postgresql+asyncpg://` connection strings) doesn't support the `sslmode=require` parameter like the standard psycopg2 driver
2. Digital Ocean's PostgreSQL requires SSL connections in production environments
3. Our connection string was using parameters that worked with psycopg2 but not with asyncpg

## The Solution

We implemented a custom SSL context solution that works with the asyncpg driver:

```python
# Create async engine with proper SSL configuration for asyncpg
import os
import ssl

# Extract database URL
db_url = settings.DATABASE_URL

# Configure SSL for asyncpg correctly
connect_args = {}
if 'sslmode' in db_url or 'ssl=true' in db_url:
    # For production with SSL, use SSL context instead of sslmode
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    connect_args = {"ssl": ssl_context}
    
    # Remove sslmode or ssl=true from the URL as it's not compatible with asyncpg
    db_url = db_url.replace('?sslmode=require', '')
    db_url = db_url.replace('&sslmode=require', '')
    db_url = db_url.replace('?ssl=true', '')
    db_url = db_url.replace('&ssl=true', '')

# Create async engine with proper configuration
engine = create_async_engine(
    db_url,
    echo=settings.DEBUG,
    pool_pre_ping=True,  # Enable connection pool "pre-ping" feature
    connect_args=connect_args
)
```

## How It Works

1. **SSL Context Creation**: We create a proper SSL context object using Python's built-in `ssl` module
2. **Parameter Removal**: We remove the incompatible `sslmode=require` or `ssl=true` parameters from the connection URL
3. **Connection Configuration**: We pass the SSL context via the `connect_args` parameter to `create_async_engine()`

This approach:

- Works with asyncpg's expectations for SSL configuration
- Maintains security with SSL encryption
- Is compatible with Digital Ocean's PostgreSQL service
- Avoids the TypeError by not using unsupported parameters

## Why We Use CERT_NONE

We used `ssl.CERT_NONE` and `check_hostname=False` because:

1. Digital Ocean's managed databases use self-signed certificates that aren't in the standard certificate chain
2. The connection is already secured within Digital Ocean's internal network
3. This simplifies the deployment without requiring certificate management

In a different environment, you might want to use `ssl.CERT_REQUIRED` with proper certificate verification for maximum security.

## Debugging the Issue

To diagnose SSL connection issues, we added a debug endpoint (`/api/v1/auth/debug`) that returns:

```json
{
  "environment": {
    "variables": {
      "DATABASE_URL_TYPE": "postgresql+asyncpg",
      "DATABASE_URL_SSL": true
    }
  },
  "database": {
    "connection": "Failed",
    "error": "connect() got an unexpected keyword argument 'sslmode'",
    "error_type": "TypeError"
  }
}
```

This helped identify the exact error and confirmed the SSL configuration issue.

## Testing the Fix

After implementing the fix, the debug endpoint showed:

```json
{
  "environment": {
    "variables": {
      "DATABASE_URL_TYPE": "postgresql+asyncpg",
      "DATABASE_URL_SSL": true
    }
  },
  "database": {
    "connection": "OK",
    "version": "PostgreSQL 15.4 on x86_64-pc-linux-musl",
    "users_table_exists": true,
    "user_count": 3
  }
}
```

This confirmed that the connection was working properly with SSL enabled.

## Additional Resources

- [asyncpg Documentation](https://magicstack.github.io/asyncpg/current/)
- [SQLAlchemy with asyncpg](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html#asyncpg)
- [Digital Ocean PostgreSQL SSL Configuration](https://docs.digitalocean.com/products/databases/postgresql/how-to/connect/#ssl-modes)
- [Python SSL Module Documentation](https://docs.python.org/3/library/ssl.html)
