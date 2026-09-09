import NavBar from './NavBar';
import { Link } from 'react-router-dom';

function HomePage(){
    return(
        <div className=" min-h-screen">
            {/* Nav Bar */}
            <div className="">
                <NavBar/>
            </div>
            
            {/* Body */}
            <div className="mt-10">
                {/* New Product */}
                <div className='pr-10 pl-10'>
                    <div className='mr-10 ml-10 w-40 rounded-xl flex items-center justify-center pt-1 pb-1 bg-orange-100 text-red-500 font-bold text-xs'>
                        <svg className=' flex items-center justify-center w-5 h-5' xmlns="http://w3.org" viewBox="0 0 48 24" width="48" height="24" fill="orange">
                            <polygon points="10,1 12.9,6.9 19.4,7.8 14.7,12.4 15.8,18.9 10,15.8 4.2,18.9 5.3,12.4 0.6,7.8 7.1,6.9" />                           
                        </svg>
                        <p>Bộ sưu tập mới 2025</p>
                    </div>

                    <div className='flex mt-4 mr-10 ml-10'>
                        <div className='md:w-1/2'>
                            <p className='text-8xl font-bold'>
                                Bước vào<br/>
                                <span className='text-orange-500'>phong cách</span><br/>
                                của bạn
                            </p>

                            <p className='mt-10 text-gray-500'>
                                Khám phá hàng nghìn đôi giày từ các thương hiệu hàng đầu thế giới. <br/>Chính hãng, bảo hành, đổi trả dễ dàng.
                            </p>

                            <div className='mt-10 flex items-center gap-3'>
                                <Link className='bg-orange-400 p-4 pr-5 pl-5 text-white font-bold rounded-xl'>Mua sắm ngay</Link>
                                <Link className='border border-gray-500 p-4 pr-5 pl-5 font-bold rounded-xl'>Xem bộ sưu tập</Link>
                            </div>

                            <div className='mt-10 flex item-center gap-3'>
                                <div className='border-r pr-4'>
                                    <p className='text-2xl font-bold'>10K+</p>
                                    <p className='text-xs text-gray-500 flex items-center justify-center'>Khách hàng</p>
                                </div>

                                <div className='border-r pr-4'>
                                    <p className='text-2xl font-bold'>500+</p>
                                    <p className='text-xs text-gray-500 flex items-center justify-center'>Mẫu giày</p>
                                </div>

                                <div className='pr-4'>
                                    <p className='text-2xl font-bold'>4.9/5</p>
                                    <p className='text-xs text-gray-500 flex items-center justify-center'>Đánh giá</p>
                                </div>
                            </div>
                        </div>
                        

                        <div className='md:w-1/2'>
                            <img className='rounded-3xl' src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format" alt="" />
                        </div>
                    </div>
                </div>

                
                <div className='bg-gray-50 mt-10'>
                    {/* List */}
                    <div className='mt-10 mr-10 ml-10 p-10'>
                        <p className='text-xl font-bold'>Khám phá theo danh mục</p>
                        <div className='grid grid-cols-5 mt-4  gap-3'>
                            <div className='col-span-1 flex items-center justify-center bg-orange-100 p-5'>
                                Sneaker
                            </div>

                            <div className='col-span-1 flex items-center justify-center bg-yellow-100 p-5'>
                                Boots
                            </div>

                            <div className='col-span-1 flex items-center justify-center bg-blue-100 p-5'>
                                Sandals
                            </div>

                            <div className='col-span-1 flex items-center justify-center bg-red-100 p-5'>
                                Heels
                            </div>

                            <div className='col-span-1 flex items-center justify-center bg-green-100 p-5'>
                                Loafers
                            </div>
                        </div>

                    </div>
                    {/* Hot Product */}
                    <div>

                    </div>

                    {/* Discount */}
                    <div>

                    </div>

                    {/* Best Seller */}
                    <div>

                    </div>
                </div>
            </div>
        </div>
    );
}

export default HomePage;