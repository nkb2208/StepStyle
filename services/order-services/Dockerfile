FROM php:8.2-cli


RUN apt-get update && apt-get install -y \
    unzip \
    git \
    libzip-dev \
    && docker-php-ext-install pdo_mysql zip



COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY . . 


RUN composer install --no-interaction --optimize-autoloader

EXPOSE 8000

CMD [ "php", "artisan", "serve", "--host", "0.0.0.0", "--port", "8000" ]