# Payment Gateway POC

This is a proof of concept (POC) project for a payment gateway built using NestJS, PostgreSQL, Prisma, and pg. The project aims to demonstrate the basic functionality of a payment processing system.

## Technologies Used

- **NestJS**: A progressive Node.js framework for building efficient and scalable server-side applications.
- **PostgreSQL**: A powerful, open-source relational database system.
- **Prisma**: A modern database toolkit that simplifies database access and management.
- **pg**: A PostgreSQL client for Node.js.

## Project Structure

```
payment-gateway-poc
├── src
│   ├── main.ts                # Entry point of the application
│   ├── app.module.ts          # Root module of the application
│   ├── payments                # Payments module containing controller and service
│   │   ├── payments.module.ts
│   │   ├── payments.controller.ts
│   │   ├── payments.service.ts
│   │   └── dto                # Data Transfer Objects for payments
│   │       ├── create-payment.dto.ts
│   │       └── update-payment.dto.ts
│   ├── prisma                 # Prisma module for database interaction
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   └── common                 # Common utilities such as filters and interceptors
│       ├── filters
│       │   └── http-exception.filter.ts
│       └── interceptors
│           └── logging.interceptor.ts
├── prisma
│   ├── schema.prisma          # Database schema definition
│   └── migrations              # Database migrations
│       └── .gitkeep
├── test                       # End-to-end tests
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
├── .env                       # Environment variables
├── .env.example               # Example environment variables
├── .gitignore                 # Files to ignore in version control
├── nest-cli.json              # Nest CLI configuration
├── package.json               # NPM dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── tsconfig.build.json        # TypeScript build configuration
└── README.md                  # Project documentation
```

## Getting Started

1. Clone the repository:
   ```
   git clone <repository-url>
   cd payment-gateway-poc
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up the database:
   - Create a PostgreSQL database and update the connection string in the `.env` file.

4. Run the application:
   ```
   npm run start
   ```

5. Access the API documentation (if applicable) or test the endpoints using tools like Postman.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or features.

## License

This project is licensed under the MIT License. See the LICENSE file for details.