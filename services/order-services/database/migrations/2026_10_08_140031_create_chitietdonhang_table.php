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
        Schema::create('chitietdonhang', function (Blueprint $table) {
            $table->id('ma_chi_tiet');
            $table->unsignedInteger('ma_don_hang');
            $table->unsignedInteger('ma_bien_the')->nullable();
            $table->string('ten_san_pham', 255);
            $table->string('kich_co', 20);
            $table->string('mau_sac',50);
            $table->unsignedInteger('so_luong')->default(1);
            $table->decimal('don_gia', 15,0)->default(0);

            $table->unique(['ma_don_hang', 'ma_bien_the']);
            $table->foreign('ma_don_hang')->references('ma_don_hang')->on('donhang')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chitietdonhang');
    }
};
