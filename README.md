# Perrys Colection -E-commerce Platform for a Single Shop 

* Connecting Perrys Collection with its customers in one dedicated platform.

# OverView
* Perrys Collection is full_stack e-commerce web app for single physical/virtual shop owned by Perrys Collection.It allows:

* Customers to browse products, search,add to cart, message the shop owner and place orders.
* The shop owner(admin) to manage products,accept/reject orders and reply to customer messages.

* AI integration(smart search/recommendations)

* Built with Django(DRF) + React + PostgreSQL. 

# Core Features
# Customer Side
* User registration & login (email/password)

* Browse products by category, search, filter

* Product detail page

* Shopping cart (add, remove, update quantity)

* Checkout & order placement

* Messaging system (chat with shop owner)

* Order history & status tracking

# Shop Owner Side
* Admin dashboard (shop management)

* Product CRUD (create, read, update, delete)

* View incoming orders, accept/reject/fulfill

* Reply to customer messages

# AI Itergration
* Product recommendations based on browsing history

* Smart search / semantic search

* Optional: chatbot for common questions

# Tech Stack 
* Backend API --- Django + Django REST Framework(DRF)
* Frontend -- React
* Database -- PostgreSQL
* Auth -- JWT
* Real-time django Channels(for messaging)
* AI -- OpenAI api

# Project Structure
perrys_collection/
├── backend/
│   ├── manage.py
│   ├── perrys_backend/        # Django project
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── dev.py
│   │   │   └── prod.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   └── apps/
│       ├── users/              # Custom user model, auth, customer profiles
│       ├── products/           # Product catalog, categories
│       ├── cart/               # Cart logic (session or DB)
│       ├── orders/             # Order, checkout, payments
│       ├── messaging/          # Chat between customer & shop owner
│       └── ai/                 # AI recommendation / search
├── frontend/
│   └── react-app/              # React frontend (Vite)
├── .env
├── requirements.txt
└── README.md
