import Footer from "../layouts/Footer";
import NavBar from "../layouts/NavBar";
import { Link } from "react-router-dom";

function Cart(){
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
        <div className="bg-gray-100 flex flex-col min-h-screen">
            <div>
                <NavBar/>
            </div>

            {/* Body */}
            <div className="p-10">
                <div className="p-10 mr-10 ml-10">
                    <p className="text-3xl font-bold">Giỏ hàng <span className="text-orange-400">- 1 sản phẩm</span></p>

                    <div className="gap-4 flex mt-4" >
                        <div className="pr-2 pl-2 pt-5 pb-3 bg-white rounded-xl flex w-2/3 size-fit">
                            <div className=" flex items-center justify-center w-1/6">
                                <img className="w-24 h-24 rounded-xl" src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format" alt="" />
                            </div>

                            <div className="w-5/6">
                                <div>
                                    <div className="w-full flex items-center justify-between">
                                        <p className="font-boldtext-xs text-blue-500">Adidas</p>
                                        <button>
                                            <svg className="text-gray-500 hover:text-red-500" xmlns="http://w3.org" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M3 6h18" />
                                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                                <line x1="10" y1="11" x2="10" y2="17" />
                                                <line x1="14" y1="11" x2="14" y2="17" />
                                            </svg>
                                        </button>
                                    </div>

                                    <p className="font-bold">Ultra Boots 22</p>
                                    <p className="text-xs text-gray-500">Size 38 - <span>Trắng</span></p>
                                </div>


                                {/* Quantity and Total Purchase */}
                                <div className="mt-4 flex items-center justify-between w-full">
                                    {/* Quantity */}
                                    <div className="w-24 flex items-center gap-2 border border-gray-300 rounded-md pr-2 pl-2">
                                        <button onClick={handleReduceQuantity} className="border-r w-1/4">-</button>
                                        <p className="flex items-center justify-center w-2/4">{quantity}</p>
                                        <button onClick={handleIncreaseQuantity} className="border-l w-1/4">+</button>
                                    </div>

                                    <div className="text-orange-400 font-bold">
                                        3.490.000 ₫
                                    </div>
                                </div>
                            </div>
                        </div>


                        <div className="w-1/3 bg-white p-10 rounded-xl">
                            <p className="text-md font-bold">Tóm tắt đơn hàng</p>

                            <div className="mt-4 flex items-center justify-between">
                                <p>Tạm tính <span>1</span> sp</p>
                                <p>3.490.000 ₫</p>
                            </div>

                            <div className="mt-2 flex items-center justify-between">
                                <p>Phí vận chuyển</p>
                                <p className="font-bold text-md text-green-500">Miễn phí</p>
                            </div>

                            <div className="mt-2 border-t border-gray-100 text-md flex items-center justify-between">
                                <p className="font-bold">Tổng cộng</p>
                                <p className="text-orange-400 font-bold">3.490.000 ₫</p>
                            </div>

                            <div className="mt-4">
                                <form className="flex items-center gap-3  w-full" action="">
                                    <input className="w-4/5 p-2 pr-3 pl-3 border border-gray-300 rounded-md" type="text" name="" id="" placeholder="Mã giảm giá" />
                                    <button className="w-1/5 bg-gray-100 hover:bg-gray-200 font-bold rounded-md p-2 pr-3 pl-3">Áp dụng</button>
                                </form>
                            </div>


                            <Link to='/checkout' className="mt-4 rounded-xl w-full text-white bg-orange-500 flex items-center justify-center pr-3 pl-3 p-2">Tiến hành thanh toán</Link>
                            <Link to='/product' className="mt-4 text-gray-400 hover:text-orange-400 flex items-center justify-center">Tiếp tục mua sắm</Link>
                        </div>
                    </div>
                </div>


                {/* If there is no product in cart, it will display the code below */}
                {/* <div className="p-10">
                    <div className="flex items-center justify-center">
                        <svg xmlns="http://w3.org" className='w-32 h-32' width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5zM3.102 4l1.313 7h8.17l1.313-7H3.102zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                        </svg> 
                    </div>
 
                    <p className="text-3xl mt-4 font-bold flex items-center justify-center">Giỏ hàng trống</p>    
                    <p className="mt-4 text-gray-500 flex items-center justify-center">Hãy thêm đôi giày yêu thích vào giỏ nhé!</p>  

                    
                    <div className="mt-4 flex items-center justify-center">                   
                        <Link to='/home' className="text-xl bg-orange-400 p-3 pr-4 pl-4 rounded-xl font-bold text-white">Tiếp tục mua sắm</Link> 
                    </div>        
                </div> */}
            </div>

            {/* Footer */}
            <div className="mt-auto">
                <Footer/>
            </div>
        </div>
    );
}

export default Cart;