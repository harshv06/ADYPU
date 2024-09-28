FROM node:latest
COPY . .
RUN npm install
EXPOSE 3100
CMD [ "npm", "start" ]