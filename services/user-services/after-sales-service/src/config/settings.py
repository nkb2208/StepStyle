import os
from pathlib import Path
from dotenv import load_dotenv

import pymysql

pymysql.install_as_MySQLdb()

BASE_DIR = Path(__file__).resolve().parent.parent

SERVICE_DIR = BASE_DIR.parent
load_dotenv(SERVICE_DIR / ".env")
if len(BASE_DIR.parents) > 3:
    load_dotenv(BASE_DIR.parents[3] / ".env")

SECRET_KEY = (
    os.environ.get("SECRET_KEY")
    or os.environ.get("BETTER_AUTH_SECRET")
    or "django-insecure-fallback-key-for-local-dev"
)
DEBUG = os.environ.get("DEBUG", "False").strip().lower() in ("true", "1", "yes")
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.staticfiles",
    "rest_framework",
    "aftersales",
    "drf_spectacular",
]

MIDDLEWARE = [
    "django.middleware.common.CommonMiddleware",
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

# ── Inter-service contract: Order Service (Service 4) ──
ORDER_SERVICE_URL = os.environ.get("ORDER_SERVICE_URL", "http://127.0.0.1:8000").rstrip("/")
ORDER_SERVICE_TIMEOUT = float(os.environ.get("ORDER_SERVICE_TIMEOUT", "5.0"))
INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "")

# ── Inter-service contract: Catalog & Search Service (Service 3) ──
CATALOG_SERVICE_URL = os.environ.get("CATALOG_SERVICE_URL", "http://127.0.0.1:8083").rstrip("/")
CATALOG_SERVICE_TIMEOUT = float(os.environ.get("CATALOG_SERVICE_TIMEOUT", "3.0"))
CATALOG_SYNC_ENABLED = os.environ.get("CATALOG_SYNC_ENABLED", "true").strip().lower() in ("true", "1", "yes")

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": [],
    "UNAUTHENTICATED_USER": None,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "After-Sales & Feedback Service API",
    "DESCRIPTION": (
        "API Hậu mãi & Đánh giá sản phẩm (Service 5). "
        "Xác minh chủ sở hữu đơn hàng và sản phẩm đã mua thông qua API contract với Order Service."
    ),
    "VERSION": "1.2.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "ENUM_NAME_OVERRIDES": {
        "AfterSalesRequestStatusEnum": [
            ("PENDING", "PENDING"),
            ("APPROVED", "APPROVED"),
            ("REJECTED", "REJECTED"),
            ("COMPLETED", "COMPLETED"),
            ("CANCELLED", "CANCELLED"),
        ],
        "AfterSalesProcessStatusEnum": [
            ("APPROVED", "APPROVED"),
            ("REJECTED", "REJECTED"),
            ("COMPLETED", "COMPLETED"),
        ],
    },
    "TAGS": [
        {
            "name": "1. Feedback (Đánh giá sản phẩm)",
            "description": "CRUD đánh giá sản phẩm và thống kê điểm đánh giá",
        },
        {
            "name": "2. After-Sales (Yêu cầu hậu mãi & Đổi trả)",
            "description": "CRUD yêu cầu đổi size, trả hàng, hỗ trợ, hủy yêu cầu và xử lý của Admin",
        },
    ],
}

TIME_ZONE = "Asia/Ho_Chi_Minh"
USE_TZ = False
STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
