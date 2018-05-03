# Hello World!

This is the source code for the **Sauce For Your Thoughts** API service.

# Install

Run `npm install` to download all of the necessary packages.

# Requirements

This application was built in [NodeJS](https://nodejs.org/en/) on version `v7.10.0`.  

# Usage

1) You will need to create a `variables.env` file. The file must contain a `DATABASE` connection string, a `SECRET` string for authentication, `PORT` for the port number express should be listening to, and `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS` for sending emails.

2) Run `npm run watch` to start the server.

# Port Number 

The default port number is `8080` but can easily be overriden by setting a `PORT` in the variables.env file.

If everything has gone well, Express should now be listening to API requests.

# Roadmap

- [x] Standardize JSON that is expected by the server.
- [x] Add route for adding a review.
- [x] Skew mongoose object _id's.
- [x] Reduce amount of data returned on requests to get all sauces.
- [ ] Add additional sauce parameters (label, smell, texture, etc.).
- [ ] Figure out way to manage user image uploads.
- [ ] Add 'staging' feature for sauces before they go out to public.
- [ ] Add way to handle when/if user reports inappropriate content.
- [ ] Create a Model that has a list of inappropriate/unacceptable words.
- [ ] Run user input through scanner to filter out unwanted language.
- [ ] Add different ways for users to filter through the sauces (i.e. by pepper, hottest, highest rated, etc.).
- [ ] Allow users to mark if they have tried a sauce already.
- [ ] Allow users to have favorite sauces.
- [ ] Allow users to follow other users.
- [ ] Standardize code documentation.
- [ ] Write tests.