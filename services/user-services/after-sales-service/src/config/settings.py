import os
from pathlib import Path

import pymysql

pymysql.install_as_MySQLdb()  # dùng PyMySQL để nối MySQL

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = "dev-only-change-me"
DEBUG = True
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.staticfiles",  # để trang thử API hiện đẹp
    "rest_framework",
    "aftersales",
    'drf_spectacular',
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "APP_DIRS": True,
        "OPTIONS": {"context_processors": []},
    }
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": os.environ.get("DB_NAME", "stepstyle_db"),
        "USER": os.environ.get("DB_USER", "root"),
        "PASSWORD": os.environ.get("DB_PASSWORD", "root"),
        "HOST": os.environ.get("DB_HOST", "127.0.0.1"),
        "PORT": os.environ.get("DB_PORT", "3307"),
        "OPTIONS": {"charset": "utf8mb4"},
    }
}

REST_FRAMEWORK = {
    # Chưa làm đăng nhập: ai cũng gọi được (sẽ thêm sau)
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": [],
    "UNAUTHENTICATED_USER": None,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'After-Sales & Feedback Service API',
    'DESCRIPTION': 'API Hậu mãi & Đánh giá',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'TAGS': [
        {"name": "1. Feedback (Đánh giá sản phẩm)", "description": "Các API quản lý đánh giá của khách hàng"},
        {"name": "2. After-Sales (Yêu cầu hậu mãi & Đổi trả)", "description": "Các API xử lý đổi trả, bảo hành, khiếu nại"},
    ],
}

TIME_ZONE = "Asia/Ho_Chi_Minh"
USE_TZ = False
STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"