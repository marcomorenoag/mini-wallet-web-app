# Intro

1. A four-modules web app to simulate a Mini Wallet Web App
2. All of the modules are connected into a flow as: Login -> Home -> New transaction -> Confirmation's Voucher
3. From the engineering standpoint, the codebase should be performant to scale up to millions of DAU

---

# Requirements

## Functional

1. Users can log into their accounts — out of scope: account creation and password reset
2. Auth users should be able to see their own account info (at Home module):
   1. Balance
   2. User name
   3. List of movements/operations — withdrawals or deposits
3. Auth users can receive deposits, adding up the transaction amount to their debit amount
4. Auth users should be able to start a new transaction to transfer money to another account

## Non Functional

Due to the nature of the application (dealing with money), it must:

- always serve and mutate data owned and belonging to the same user, i.e. client Alice MUST only see and operate on its own data (balance, money, etc)
- ensure ACID
- prioritize Consistency over Availability, but still having good availability (ex: ~99.9% -> 8h 46m of downtime / year)
- guarantee Idempotency of transactions -> no repeated/double transactions.
- make data highly secure -> this is going to be mock data, but should set the framework to isolate or threat the data as sensitive / PII, like for future PCI DSS compliance

The web app should be responsive and adapt to different screens.
Additionally, from the engineering standpoint, the system should be capable to scale up to Millions of DAU.
Let's assume 100M DAU:

- Login operations -> 100M / 10^5 (~seconds per day) = 1K rps
- Home operations (account details and list transfers)
  - Average of 10 operations / user
  - 100M \* 10 = 1B
  - 1B / 10^5 = 10K rps
- Transactions
  - Average of 10 / users = 10K rps

---

# Modules

## 01 - Login

- Should use mock data
- Contains a login page with:
  - A form asking for phone and email, which should be validated
  - Different states: loading or error page
- Once the access was successful:
  - there has to be a session persisted
  - user should be taken into the Home page

## 02 - Home

- Should display account balance and account details (user name)
- Lists all the transactions for that account
- Should display a CTA to transition users onto the New Transaction module
- Displays different states: loading, empty or error page

## 03 - New transaction

- Asks for an amount to transfer
- Displays a list of favorite contacts to choose the destination of the transfer
- Users can manually enter a new contact and save it into their favorite contacts
- Must display a summary page for the transaction operation, and ask for confirmation
- When a response arrives, directs users to the Voucher module

## 04 - Voucher

- If the transfer failed, it should display an error page with reason of failure
- If it was successful, it should display a voucher with the details

---

# Architecture
