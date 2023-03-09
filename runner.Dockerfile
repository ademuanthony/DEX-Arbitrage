FROM node:10-alpine

WORKDIR /usr/src/app

COPY ./ ./
RUN npm install
RUN ls ./

CMD ["npm", "run","runner"]