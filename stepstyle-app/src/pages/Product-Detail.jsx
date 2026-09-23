import { useState } from "react";
import Footer from "../layouts/Footer";
import NavBar from "../layouts/NavBar";
import { Link } from "react-router-dom";
import AllProduct from "./products/AllProduct";

function ProDuctDetail(){
    const [color, setColor] = useState('no');

    const [size, setSize] = useState('38');

    let [quantity, setQuantity] = useState(1);

    const handleIncreaseQuantity = () =>{
        quantity= quantity+1;
        setQuantity(quantity);
    }

    const handleReduceQuantity = () =>{
        quantity-=1;
        if(quantity <1){
            quantity =1;
        }
        setQuantity(quantity);
    }

    return(
        <div className="flex flex-col min-h-screen bg-gray-100">
            <div>       
                <NavBar/>
            </div>

            {/* Body */}
            <div className="p-10">
                <p className="text-gray-500"><Link to='/home'>Trang chủ</Link>/ <Link to= '/products'>sản phẩm</Link>/ <span className="text-black">Airmax 270 React</span></p>

                <div className="mt-4 flex gap-3">
                    <div className="w-1/2">
                        <img className="rounded-xl" src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format" alt="" />
                    </div>

                    <div className="pl-5 pr-5 w-1/2">
                        {/* Category */}
                        <p className="p-1 pr-2 pl-2 bg-blue-100 text-blue-500 w-fit rounded-xl font-bold">Nike</p>
                        {/* Product name */}
                        <p className="text-3xl font-bold mt-4">Airmax 270 React</p>
                        {/* Rating */}
                        <div className="flex items-center gap-3">
                            <svg className='flex items-center gap-3 w-20 h-20' xmlns="http://w3.org" viewBox="0 0 120 24" fill="#FFC107" width="120" height="24">
                                <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                <path d="M36 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                <path d="M60 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                <path d="M84 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                <path d="M108 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                            </svg>
                            <p><span className="font-bold">4.8</span> (324)</p>
                        </div>

                        {/* Price */}
                        <div className="flex items-center gap-3">
                            <p className="text-4xl font-bold text-orange-500">
                                2.890.000đ 
                                <span className="ml-2 text-xl text-gray-500">3.200.000 ₫</span>
                            </p>

                            <p className="p-1 pr-2 pl-2 bg-orange-100 text-orange-500 w-fit rounded-xl font-bold">-10%</p>
                        </div>

                        {/* Color */}

                        <div className="mt-4">
                            <p className="font-bold">
                                Màu sắc:  
                                <span className="ml-1 text-orange-500">
                                    {color === 'no'?"Chưa chọn":""}
                                    {color === 'white'?"Trắng":""}
                                    {color === 'black'?"Đen":""}
                                    {color === 'red'?"Đỏ":""}
                                </span> 
                            </p>
                            <div className="mt-2 flex gap-3 items-center">
                                <button onClick={()=> setColor('white')} className="border border-gray-500 rounded-xl p-2 pr-3 pl-3">Trắng</button>

                                <button onClick={()=> setColor('black')} className="border border-gray-500 rounded-xl p-2 pr-3 pl-3">Đen</button>

                                <button onClick={()=> setColor('red')} className="border border-gray-500 rounded-xl p-2 pr-3 pl-3">Đỏ</button>
                            </div>
                        </div>

                        {/* Size */}
                        <div className="mt-4">
                            <p className="font-bold">
                                Size:  
                                <span className="ml-1 text-orange-500">
                                    {size === '38'?"38":""}
                                    {size === '39'?"39":""}
                                    {size === '40'?"40":""}
                                    {size === '41'?"41":""}
                                </span> 
                            </p>
                            <div className="mt-2 flex gap-3 items-center">
                                <button onClick={()=> setSize('38')} className="border border-gray-500 rounded-xl p-2 pr-3 pl-3">38</button>

                                <button onClick={()=> setSize('39')} className="border border-gray-500 rounded-xl p-2 pr-3 pl-3">39</button>

                                <button onClick={()=> setSize('40')} className="border border-gray-500 rounded-xl p-2 pr-3 pl-3">40</button>

                                <button onClick={()=> setSize('41')} className="border border-gray-500 rounded-xl p-2 pr-3 pl-3">41</button>
                            </div>

                            {/* Quantity */}
                            <div className="mt-4 flex items-center gap-3">   
                                <p className="font-bold">Số lượng:</p>

                                <div className="w-24 flex items-center gap-2 border border-gray-500 rounded-md p-2 pr-3 pl-3 font-bold">
                                    <button onClick={handleReduceQuantity} className="border-r w-1/4">-</button>
                                    <p className="flex items-center justify-center w-2/4">{quantity}</p>
                                    <button onClick={handleIncreaseQuantity} className="border-l w-1/4">+</button>
                                </div>

                                <p className="text-gray-400">Còn 45 sản phẩm</p>
                            </div>

                            {/* Btn add to cart and purchase */}
                            <div className="mt-4 flex items-center gap-3">
                                <button className="w-1/2 bg-orange-500 rounded-xl hover:bg-orange-600 text-white font-bold text-xl p-5">
                                    Thêm vào giỏ hàng
                                </button>



                                <button className="text-orange-500 border border-orange-500 w-1/2 font-bold text-xl p-5 rounded-xl hover:bg-orange-50">
                                    Mua ngay
                                </button>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="mt-4">
                            <p className="font-bold ">Mô tả sản phẩm</p>

                            <p className="text-xs">Giày chạy bộ với đệm Air Max 270 mang lại cảm giác êm ái tuyệt vời. Thiết kế hiện đại phù hợp cho mọi hoạt động thể thao.</p>
                        </div>
                    </div>
                </div>
                
                <div className="mt-4">
                    <p className="text-2xl font-bold">Sản phẩm liên quan</p>
                    <div>
                        <AllProduct/>
                    </div>
                </div>

            </div>

            <div className="mt-auto">
                <Footer/>
            </div>
        </div>
    );
}

export default ProDuctDetail;