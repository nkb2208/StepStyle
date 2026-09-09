import NavBar from "./NavBar";

function ProductPage(){
    return(
        <div className=" min-h-screen">
            {/* Nav Bar */}
            <div className="">
                <NavBar/>
            </div>
            
            {/* Body */}
            <div className="p-5">
                <div>
                    <p className='text-2xl font-bold'>Tất cả sản phẩm</p>
                    <p className='text-gray-500'><span>12</span> sản phẩm</p>
                </div>

                <div className='flex mt-4'>
                    <div className='w-1/4'>
                        1
                    </div>

                    <div className='w-3/4'>
                        2
                    </div>
                </div>
            </div>
        </div>
    );
}


export default ProductPage;