FROM node:14

#install CLI mariadb/mysql client
RUN wget https://downloads.mariadb.com/MariaDB/mariadb_repo_setup
RUN echo b9e90cde27affc2a44f9fc60e302ccfcacf71f4ae02071f30d570e6048c28597 mariadb_repo_setup | sha256sum -c -
RUN chmod +x mariadb_repo_setup
RUN ./mariadb_repo_setup    --mariadb-server-version=mariadb-10.6
RUN apt update
RUN apt install -y mariadb-client

# Create app directory
WORKDIR /usr/src/app

# Define graphql server port
ARG ENV_ARG=production

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm i -g npm@7.5.6
RUN npm install

## Add the wait script to the image
ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.7.3/wait /wait
RUN chmod +x /wait

# If you are building your code for production
# RUN npm ci --only=production

# Create DB if it doesn't exist
ADD .scripts/create_db.sh /create_db.sh
RUN chmod +x /create_db.sh

# Bundle app source & config files for TypeORM & TypeScript
COPY ./src ./src
COPY ./tsconfig.json .
COPY ./tsconfig.build.json .
COPY ./wallet-manager.yml .

RUN npm run build

ENV NODE_ENV=${ENV_ARG}

CMD ["/bin/sh", "-c", "/create_db.sh && npm run migration:run && npm run start:prod"]
