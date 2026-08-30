FROM node:20-alpine AS build
WORKDIR /app
ENV CI=false DISABLE_ESLINT_PLUGIN=true ESLINT_NO_DEV_ERRORS=true TSC_COMPILE_ON_ERROR=true NODE_OPTIONS=--max-old-space-size=4096
ARG REACT_APP_BACKEND_URL=https://leadflowcrm.pro
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
COPY package.json ./
RUN sed -i '/@emergentbase\/visual-edits/d' package.json \
 && yarn install --network-timeout 600000
COPY . .
RUN yarn build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
