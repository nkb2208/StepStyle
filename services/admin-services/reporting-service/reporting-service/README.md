# StepStyle Analytics & Reporting Service

Dịch vụ Báo cáo & Thống kê dữ liệu bán hàng cho StepStyle Admin, viết bằng FastAPI.

## Chức năng chính
- Thống kê chỉ số KPI tổng quan (Doanh thu, Đơn hàng, Giá trị TB, Tỉ lệ huỷ đơn).
- Thống kê doanh thu và đơn hàng theo từng tháng trong năm.
- Thống kê tỷ lệ phân bổ trạng thái đơn hàng (Thành công, Hủy, Đang xử lý).
- Top 5 sản phẩm/đôi giày bán chạy nhất theo số lượng và doanh thu.
- Thống kê theo phương thức thanh toán.

## Khởi chạy trực tiếp
```bash
pip install -r requirements.txt
python -m reporting.main
```
Dịch vụ chạy tại `http://localhost:4006`, tài liệu API tại `http://localhost:4006/docs`.
