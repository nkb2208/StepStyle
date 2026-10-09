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
        Schema::create('thanhtoan', function (Blueprint $table) {
            $table->id('ma_thanh_toan');
            $table->unsignedInteger('ma_don_hang');
            $table->unsignedInteger('ma_phuong_thuc');
            $table->decimal('so_tien',15,0)->default(0);
            $table->enum('trang_thai_thanh_toan', ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'])->default('PENDING');
            $table->string('ma_giao_dich_thanh_cong',100)->nullable();
            $table->dateTime('ngay_tao')->useCurrent();
            $table->dateTime('ngay_thanh_toan')->nullable();

            $table->foreign('ma_don_hang')->references('ma_don_hang')->on('donhang')->cascadeOnDelete();
            $table->unique(['ma_phuong_thuc', 'ma_giao_dich_thanh_cong']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('thanhtoan');
    }
};
