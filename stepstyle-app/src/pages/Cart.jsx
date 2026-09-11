import Footer from "../layouts/Footer";
import NavBar from "../layouts/NavBar";
import { Link } from "react-router-dom";

function Cart(){
    return( 
        <div className="min-h-screen">
            <div>
                <NavBar/>
            </div>

            {/* Body */}
            <div className="p-10 flex items-center justify-center">
                <div className="p-10">
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
                </div>
            </div>

            {/* Footer */}
            <div>
                <Footer/>
            </div>
        </div>
    );
}

export default Cart;