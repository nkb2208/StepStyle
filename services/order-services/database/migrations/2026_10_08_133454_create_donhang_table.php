le<?php

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
        Schema::create('donhang', function (Blueprint $table) {
            $table->increments('ma_don_hang');
            $table->unsignedInteger('ma_nguoi_dung')->nullable();
            $table->string('ten_nguoi_nhan', 255);
            $table->string('so_dien_thoai_nhan', 20);
            $table->text('dia_chi_giao_hang');
            $table->decimal('tong_tien_hang',15,0)->default(0);
            $table->decimal('tien_giam_gia',15,0)->default(0);
            $table->decimal('phi_van_chuyen',15,0)->default(0);
            $table->decimal('tong_thanh_toan',15,0)->default(0);
            $table->enum('trang_thai_don_hang', ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'])->default('PENDING');
            $table->unsignedInteger('ma_giam_gia')->nullable(); 
            $table->text('ghi_chu')->nullable();
            
            $table->dateTime('ngay_dat')->useCurrent();
            $table->dateTime('ngay_cap_nhat')->useCurrent()->useCurrentOnUpdate();

            $table->index(['ma_nguoi_dung', 'ngay_dat']);
            $table->index(['trang_thai_don_hang', 'ngay_dat']);

            
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('donhang');
    }
};
