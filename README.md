# Shop Town - Ecommerce Website - SERVER

Shop Town is a comprehensive ecommerce website that provides a seamless buying and selling experience for users. It is built using Node.js, Express.js, PostgreSQL with Sequelize, Redis for cache storage, BullMQ for cron operations, Twilio for phone SMS and WhatsApp messaging, and incorporates Flutter Wave and Seerbit for secure payment options. The platform includes a built-in wallet system and leverages Okra for bank details verification. It offers features for buying, selling, order tracking, product listing by vendors, and a functioning chat system for seamless communication between buyers and sellers.

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Installation](#installation)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Chat System](#chat-system)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Linting and Prettier](#linting-and-prettier)

## Features
- **Buying and Selling**: Users can browse products and place orders as buyers, and vendors can list their products for sale.
- **Order Tracking**: Real-time order tracking allows users to monitor the status of their purchases.
- **Payment Methods**: Secure card payment options are available using Flutter Wave and Seerbit.
- **Built-in Wallet**: The platform features a built-in wallet system for convenient transactions.
- **Okra Integration**: Okra is used for seamless and secure bank details verification.
- **Admin Functionalities**: Administrative tools are provided for easy management and monitoring of the platform.
- **Cron Operations**: BullMQ is utilized for handling scheduled tasks and cron operations.
- **SMS and WhatsApp Messaging**: Twilio is integrated for phone SMS and WhatsApp messaging.
- **Functioning Chat System**: A chat system is incorporated for seamless communication between buyers and sellers.

## Tech Stack
- Node.js
- Express.js
- PostgreSQL with Sequelize
- Redis for cache storage
- BullMQ for cron operations
- Twilio for phone SMS and WhatsApp messaging
- Flutter Wave and Seerbit for payment methods
- Okra for bank details verifications

## Getting Started
To run the Shop Town ecommerce website on your local machine, follow the installation instructions below.

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/shop-town.git
   ```
2. Navigate to the project directory:
   ```bash
   cd shop-town
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

## Usage
1. Start the server:
   ```bash
   npm start
   ```
2. Access the website at `http://localhost:8082` in your web browser.

## API Documentation
For detailed API documentation and usage instructions, please refer to the [API Documentation](link-to-api-documentation) section.

## Chat System
The functioning chat system allows seamless communication between buyers and sellers on the platform. Users can easily interact with each other to clarify product details, negotiate prices, and track order progress.

## Environment Variables
Before running the application, ensure you have a `.env` file with the following sample attributes:

```plaintext
# PRODUCTION ENVIRONMENT
DATABASE_URL = <postgres-database-url>

# GCLOUD PRODUCTION ENVIRONMENT
G_DB_NAME = platform_data
G_DB_HOST = /cloudsql/maximal-terrain-388910:us-central1:Shop-Town-db
G_DB_USER = Shop-Town_user
G_DB_PASSWORD = :FxRKtgSnVY8R$rf
G_DB_PORT = 5436

# DEVELOPMENT ENVIRONMENT
PG_USERNAME = Shop-Town_user
PG_PASSWORD =:FxRKtgSnVY8R$rf
PG_HOST = 127.0.0.1
PG_PORT = 5436
PG_DATABASE = platform_data

# SERVER PORT
PORT = 8082

# JWT DETAILS
ACCESS_TOKEN_EXPIRY = 43200 # 12 hour 43200
REFRESH_TOKEN_EXPIRY = 64800 # 1 18 hour 64800
REFRESH_TOKEN_JWT_SECRET = share12345678tribe
ACCESS_TOKEN_JWT_SECRET = share87654321tribe
MY_WEBISTE = donotmesswithmeIamtaximania.com

# EMAIL DETAILS FOR GOOGLE OAUTH 2.0 AND NODEMAILER
# Add other email attributes here...

# CLOUDINARY DETAILS
# Add Cloudinary attributes here...

# FLUTTERWAVE DETAILS
# Add Flutterwave attributes here...

# Default logo
LOGO = https://cdn.iconscout.com/icon/free/png-256/free-logo-3446031-2882300.png

# SHIPBUBBLE DETAILS
# Add Shipbubble attributes here...

# FACEBOOK DETAILS
# Add Facebook attributes here...

# API URL
API_URL = http://localhost:8082

# KSECURE FEE
KSECURE_FEE = 500  # 500 naira

# TWILIO DETAILS
# Add Twilio attributes here...

# REDIS DETAILS
# Add Redis attributes here...

# SEERBIT DETAILS
# Add Seerbit attributes here...
```

Replace `<postgres-database-url>` with the actual URL of your PostgreSQL database.

## Deployment
To deploy the Shop Town website, you can use the following commands:

1. For Render deployment:
   ```bash
   npm run render
   ```
2. For Google Cloud (GCloud) deployment:
   ```bash
   npm run gcloud
   ```

## Linting and Prettier
To check for linting errors, use the following command:
```bash
npm run lint:check
```

To fix linting errors automatically, use:
```bash
npm run lint:fix
```

To format the code using Prettier, run:
```bash
npm run p
```

For automatic formatting of changed files using Prettier, use:
```bash
npm run p:w
```

---

Thank you for your interest in Shop Town! We hope you have a pleasant shopping and selling experience on our platform. Happy shopping!