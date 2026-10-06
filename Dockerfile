FROM nginx:alpine

WORKDIR /usr/share/nginx/html

COPY index.html .
COPY style.css .
COPY game.js .

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]