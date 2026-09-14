import { useState, useEffect, useRef } from "react";
import Footer from "../layouts/Footer";
import NavBar from "../layouts/NavBar";

function Order(){
    const [isOpen, setIsOpen] = useState(false);

    const dropdownRef = useRef(null);

    const handleMoreOrderInfo = ()=>{
        setIsOpen(true);
    }

    useEffect(() => {
        const handleClickOutside = (e) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
            setIsOpen(false); 
        }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('mouseup', handleClickOutside);
    }, []);


    return(
        <div  className="min-h-screen flex flex-col bg-gray-100">
            <div ref={dropdownRef} className="">
                <div className="">
                    <NavBar/>
                </div>
                

                <div  className="mt-10 w-full flex items-center justify-center">
                    <div className="w-1/2 m-10">
                        <p className="text-3xl font-bold">Đơn hàng của tôi</p>

                        <div>
                            <button onClick={handleMoreOrderInfo} className="w-full flex items-center justify-between bg-white rounded-xl mt-4 p-3 pl-5 pr-5">
                                <div>
                                    <div className="flex items-center gap-3">
                                        {/* ID Order */}
                                        <p className="text-md font-bold">ORDER-001</p>
                                        {/* Order Status */}
                                        <div className="bg-green-100 text-green-500 p-1 pr-2 pl-2 rounded-xl text-xs font-bold">Đã giao</div>
                                    </div>

                                    <div className="mt-3 flex items-center gap-3 text-gray-500 text-md">
                                        {/* Date */}
                                        <p>15/8/2025</p>
                                        {/* Quantity */}
                                        <p>1 sản phẩm</p>
                                        {/* Price */}
                                        <p className="text-orange-400">2.890.000đ</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Product Img */}
                                    <div className="w-10 h-10 flex items-center">
                                        <img className="rounded-full" src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format" alt="" />
                                    </div>


                                    {!isOpen ?(
                                        
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">                                            
                                            <polyline points="5 12 12 5 19 12"></polyline>
                                        </svg>

                                    ):(
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <polyline points="19 12 12 19 5 12"></polyline>
                                        </svg>
                                    )}
                                </div>
                            </button>                            
                            {/* More Order Infor */}
                            {isOpen && (
                                <div className="absolute w-1/2 p-3 bg-white flex items-center justify-between">
                                    <div className=" flex items-center gap-3">
                                        <img className="w-20 h-20 rounded-xl" src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format" alt="" />
                                        <div>
                                            <p>Air Max 270 React</p>
                                            <p className="text-xs text-gray-500"><span>Nike</span> · <span>Size 42</span>  · <span>Trắng</span> · <span>x1</span></p>
                                        </div>
                                    </div>

                                     <p className="text-orange-400">2.890.000đ</p>
                                </div>
                            )}
                        </div>               
                    </div>
                </div>
            </div>


            <div className="mt-auto">
                <Footer/>
            </div>
        </div>
    );
}

export default Order;