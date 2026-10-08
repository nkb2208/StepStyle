<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('chitietgiohang', function (Blueprint $table) {
            $table->unsignedInteger('ma_gio_hang');
            $table->unsignedInteger('ma_bien_the');
            $table->unsignedInteger('so_luong')->default(1);
            $table->dateTime('ngay_them')->useCurrent();

            $table->primary(['ma_gio_hang', 'ma_bien_the']);

            $table->foreign('ma_gio_hang')->references('ma_gio_hang')->on('giohang')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chitietgiohang');
    }
};
