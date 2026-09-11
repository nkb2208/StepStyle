import Footer from '../layouts/Footer';
import NavBar from '../layouts/NavBar';
import { Link } from 'react-router-dom';

function HomePage(){
    return(
        <div className="relative min-h-screen">
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
                                <Link className='hover:bg-orange-500 bg-orange-400 p-4 pr-5 pl-5 text-white font-bold rounded-xl'>Mua sắm ngay</Link>
                                <Link className='hover:border-gray-500 border border-gray-300 p-4 pr-5 pl-5 font-bold rounded-xl'>Xem bộ sưu tập</Link>
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
                        <p className='text-2xl font-bold'>Khám phá theo danh mục</p>
                        <div className='grid grid-cols-5 mt-4  gap-3'>
                            <div 
                                style={{backgroundImage: `url(https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&fit=crop&auto=format)`}} 
                                className='hover:cursor-pointer hover:scale-105 transition duration-300 relative rounded-xl col-span-1 bg-cover bg-center flex items-end justify-start p-5 h-40 overflow-hidden'
                            >
                                <div className="absolute hover:bg-black/20 transition duration-300 inset-0 bg-black/40 z-0"></div>

                                <div className='relative z-10'>
                                    <p className='text-3xl font-bold text-white'>Sneakers</p>
                                    <p className='text-xs text-gray-200'>Năng động - Thể thao - Đường phố</p>
                                </div>
                            </div>

                            <div 
                                style={{backgroundImage: `url(https://media.istockphoto.com/id/1191174327/photo/fashion-model-wearing-jeans-and-brown-boots-with-zipper.jpg?s=612x612&w=0&k=20&c=oSPZltRJ6J1mGVFHHoUevqha47n0Ipaucr341OS7gRs=)`}} 
                                className='hover:cursor-pointer hover:scale-105 transition duration-300 relative rounded-xl col-span-1 bg-cover bg-center flex items-end justify-start p-5 h-40 overflow-hidden'
                            >
                                <div className="absolute hover:bg-black/20 transition duration-300 inset-0 bg-black/40 z-0"></div>

                                <div className='relative z-10'>
                                    <p className='text-3xl font-bold text-white'>Boots</p>
                                    <p className='text-xs text-gray-200'>Cá tính - Bền chắc</p>
                                </div>
                            </div>
                            <div 
                                style={{backgroundImage: `url(https://assets.woodland.social/product/images/FGC015050111A/CAMEL/FGC015050111A_010_0.webp)`}} 
                                className='hover:cursor-pointer hover:scale-105 transition duration-300 relative rounded-xl col-span-1 bg-cover bg-center flex items-end justify-start p-5 h-40 overflow-hidden'
                            >
                                <div className="absolute hover:bg-black/20 transition duration-300 inset-0 bg-black/40 z-0"></div>

                                <div className='relative z-10'>
                                    <p className='text-3xl font-bold text-white'>Sandals</p>
                                    <p className='text-xs text-gray-200'>Thoải mái - Mùa hè</p>
                                </div>
                            </div>

                            <div 
                                style={{backgroundImage: `url(https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS7pmahrJdIOx4L0uUHRnLR4GJP_U3chtsQ4WvLCB7tV7dU9H-YlUs6T1_r&s=10)`}} 
                                className='hover:cursor-pointer hover:scale-105 transition duration-300 relative rounded-xl col-span-1 bg-cover bg-center flex items-end justify-start p-5 h-40 overflow-hidden'
                            >
                                <div className="absolute hover:bg-black/20 transition duration-300 inset-0 bg-black/40 z-0"></div>

                                <div className='relative z-10'>
                                    <p className='text-3xl font-bold text-white'>Heels</p>
                                    <p className='text-xs text-gray-200'>Sang trọng - Thanh lịch</p>
                                </div>
                            </div>

                            <div 
                                style={{backgroundImage: `url(https://static01.nyt.com/images/2026/07/30/fashion/24ST-NL-THEFASHIONS-top/24ST-NL-THEFASHIONS-top-articleLarge.jpg?quality=75&auto=webp&disable=upscale)`}} 
                                className='hover:cursor-pointer hover:scale-105 transition duration-300 hover:cursor-pointer relative rounded-xl col-span-1 bg-cover bg-center flex items-end justify-start p-5 h-40 overflow-hidden'
                            >
                                <div className="absolute inset-0 bg-black/40 hover:bg-black/20 transition duration-300 z-0"></div>

                                <div className='relative z-10'>
                                    <p className='text-3xl font-bold text-white'>Loafers</p>
                                    <p className='text-xs text-gray-200'>Lịch sự - Tinh tế</p>
                                </div>
                            </div>

                        </div>

                    </div>
                    {/* Hot Product */}
                    <div className='mt-10 p-10'>
                        <p className='text-2xl font-bold pl-10 pr-10'>Nổi bật</p>

                        <div className='flex gap-4 mt-4 grid grid-cols-5 pl-10 pr-10'>
                            <div className='hover:shadow-md hover:scale-105 transition duration-300 col-span-1 rounded-xl bg-white'>
                                <img className=' rounded-t-xl' src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format" alt="" />
                                <div className='mt-4 p-3'>
                                    {/* Brand */}
                                    <p className='text-xs font-bold text-blue-500 bg-blue-100 rounded-xl w-1/6 flex items-center justify-center p-2'>Nike</p>
                                    <div className='mt-4'>
                                        {/* Product Name */}
                                        <p>Air Max 270 React</p>
                                        {/* Rate */}
                                        <div className='flex items-center gap-2'>
                                            <svg className='w-12 h-12' xmlns="http://w3.org" viewBox="0 0 120 24" fill="#FFC107" width="120" height="24">
                                                <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M36 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M60 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M84 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M108 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                            </svg>
                                            <p>(324)</p>
                                        </div>
                                        {/* Price and button add to cart */}
                                        <div className='mt-5 flex items-center justify-between'>
                                            <div className='w-2/3 text-xl font-bold text-orange-400'>2.890.000đ</div>
                                            <button className='w-1/3 bg-orange-400 hover:bg-orange-500 hover:cursor-pointer flex items-center justify-center w-1/5 text-white font-bold rounded-md'>+ Giỏ</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                           <div className='hover:shadow-md hover:scale-105 transition duration-300 col-span-1 rounded-xl bg-white'>
                                <img className=' rounded-t-xl' src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format" alt="" />
                                <div className='mt-4 p-3'>
                                    {/* Brand */}
                                    <p className='text-xs font-bold text-blue-500 bg-blue-100 rounded-xl w-1/6 flex items-center justify-center p-2'>Nike</p>
                                    <div className='mt-4'>
                                        {/* Product Name */}
                                        <p>Air Max 270 React</p>
                                        {/* Rate */}
                                        <div className='flex items-center gap-2'>
                                            <svg className='w-12 h-12' xmlns="http://w3.org" viewBox="0 0 120 24" fill="#FFC107" width="120" height="24">
                                                <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M36 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M60 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M84 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M108 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                            </svg>
                                            <p>(324)</p>
                                        </div>
                                        {/* Price and button add to cart */}
                                        <div className='mt-5 flex items-center justify-between'>
                                            <div className='w-2/3 text-xl font-bold text-orange-400'>2.890.000đ</div>
                                            <button className='w-1/3 bg-orange-400 hover:bg-orange-500 hover:cursor-pointer flex items-center justify-center w-1/5 text-white font-bold rounded-md'>+ Giỏ</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                           <div className='hover:shadow-md hover:scale-105 transition duration-300 col-span-1 rounded-xl bg-white'>
                                <img className=' rounded-t-xl' src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format" alt="" />
                                <div className='mt-4 p-3'>
                                    {/* Brand */}
                                    <p className='text-xs font-bold text-blue-500 bg-blue-100 rounded-xl w-1/6 flex items-center justify-center p-2'>Nike</p>
                                    <div className='mt-4'>
                                        {/* Product Name */}
                                        <p>Air Max 270 React</p>
                                        {/* Rate */}
                                        <div className='flex items-center gap-2'>
                                            <svg className='w-12 h-12' xmlns="http://w3.org" viewBox="0 0 120 24" fill="#FFC107" width="120" height="24">
                                                <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M36 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M60 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M84 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M108 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                            </svg>
                                            <p>(324)</p>
                                        </div>
                                        {/* Price and button add to cart */}
                                        <div className='mt-5 flex items-center justify-between'>
                                            <div className='w-2/3 text-xl font-bold text-orange-400'>2.890.000đ</div>
                                            <button className='w-1/3 bg-orange-400 hover:bg-orange-500 hover:cursor-pointer flex items-center justify-center w-1/5 text-white font-bold rounded-md'>+ Giỏ</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                           <div className='hover:shadow-md hover:scale-105 transition duration-300 col-span-1 rounded-xl bg-white'>
                                <img className=' rounded-t-xl' src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format" alt="" />
                                <div className='mt-4 p-3'>
                                    {/* Brand */}
                                    <p className='text-xs font-bold text-blue-500 bg-blue-100 rounded-xl w-1/6 flex items-center justify-center p-2'>Nike</p>
                                    <div className='mt-4'>
                                        {/* Product Name */}
                                        <p>Air Max 270 React</p>
                                        {/* Rate */}
                                        <div className='flex items-center gap-2'>
                                            <svg className='w-12 h-12' xmlns="http://w3.org" viewBox="0 0 120 24" fill="#FFC107" width="120" height="24">
                                                <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M36 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M60 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M84 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M108 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                            </svg>
                                            <p>(324)</p>
                                        </div>
                                        {/* Price and button add to cart */}
                                        <div className='mt-5 flex items-center justify-between'>
                                            <div className='w-2/3 text-xl font-bold text-orange-400'>2.890.000đ</div>
                                            <button className='w-1/3 bg-orange-400 hover:bg-orange-500 hover:cursor-pointer flex items-center justify-center w-1/5 text-white font-bold rounded-md'>+ Giỏ</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                           <div className='hover:shadow-md hover:scale-105 transition duration-300 col-span-1 rounded-xl bg-white'>
                                <img className=' rounded-t-xl' src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format" alt="" />
                                <div className='mt-4 p-3'>
                                    {/* Brand */}
                                    <p className='text-xs font-bold text-blue-500 bg-blue-100 rounded-xl w-1/6 flex items-center justify-center p-2'>Nike</p>
                                    <div className='mt-4'>
                                        {/* Product Name */}
                                        <p>Air Max 270 React</p>
                                        {/* Rate */}
                                        <div className='flex items-center gap-2'>
                                            <svg className='w-12 h-12' xmlns="http://w3.org" viewBox="0 0 120 24" fill="#FFC107" width="120" height="24">
                                                <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M36 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M60 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M84 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M108 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                            </svg>
                                            <p>(324)</p>
                                        </div>
                                        {/* Price and button add to cart */}
                                        <div className='mt-5 flex items-center justify-between'>
                                            <div className='w-2/3 text-xl font-bold text-orange-400'>2.890.000đ</div>
                                            <button className='w-1/3 bg-orange-400 hover:bg-orange-500 hover:cursor-pointer flex items-center justify-center w-1/5 text-white font-bold rounded-md'>+ Giỏ</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                           <div className='hover:shadow-md hover:scale-105 transition duration-300 col-span-1 rounded-xl bg-white'>
                                <img className=' rounded-t-xl' src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format" alt="" />
                                <div className='mt-4 p-3'>
                                    {/* Brand */}
                                    <p className='text-xs font-bold text-blue-500 bg-blue-100 rounded-xl w-1/6 flex items-center justify-center p-2'>Nike</p>
                                    <div className='mt-4'>
                                        {/* Product Name */}
                                        <p>Air Max 270 React</p>
                                        {/* Rate */}
                                        <div className='flex items-center gap-2'>
                                            <svg className='w-12 h-12' xmlns="http://w3.org" viewBox="0 0 120 24" fill="#FFC107" width="120" height="24">
                                                <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M36 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M60 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M84 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M108 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                            </svg>
                                            <p>(324)</p>
                                        </div>
                                        {/* Price and button add to cart */}
                                        <div className='mt-5 flex items-center justify-between'>
                                            <div className='w-2/3 text-xl font-bold text-orange-400'>2.890.000đ</div>
                                            <button className='w-1/3 bg-orange-400 hover:bg-orange-500 hover:cursor-pointer flex items-center justify-center w-1/5 text-white font-bold rounded-md'>+ Giỏ</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                           <div className='hover:shadow-md hover:scale-105 transition duration-300 col-span-1 rounded-xl bg-white'>
                                <img className=' rounded-t-xl' src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format" alt="" />
                                <div className='mt-4 p-3'>
                                    {/* Brand */}
                                    <p className='text-xs font-bold text-blue-500 bg-blue-100 rounded-xl w-1/6 flex items-center justify-center p-2'>Nike</p>
                                    <div className='mt-4'>
                                        {/* Product Name */}
                                        <p>Air Max 270 React</p>
                                        {/* Rate */}
                                        <div className='flex items-center gap-2'>
                                            <svg className='w-12 h-12' xmlns="http://w3.org" viewBox="0 0 120 24" fill="#FFC107" width="120" height="24">
                                                <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M36 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M60 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M84 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M108 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                            </svg>
                                            <p>(324)</p>
                                        </div>
                                        {/* Price and button add to cart */}
                                        <div className='mt-5 flex items-center justify-between'>
                                            <div className='w-2/3 text-xl font-bold text-orange-400'>2.890.000đ</div>
                                            <button className='w-1/3 bg-orange-400 hover:bg-orange-500 hover:cursor-pointer flex items-center justify-center w-1/5 text-white font-bold rounded-md'>+ Giỏ</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                           <div className='hover:shadow-md hover:scale-105 transition duration-300 col-span-1 rounded-xl bg-white'>
                                <img className=' rounded-t-xl' src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format" alt="" />
                                <div className='mt-4 p-3'>
                                    {/* Brand */}
                                    <p className='text-xs font-bold text-blue-500 bg-blue-100 rounded-xl w-1/6 flex items-center justify-center p-2'>Nike</p>
                                    <div className='mt-4'>
                                        {/* Product Name */}
                                        <p>Air Max 270 React</p>
                                        {/* Rate */}
                                        <div className='flex items-center gap-2'>
                                            <svg className='w-12 h-12' xmlns="http://w3.org" viewBox="0 0 120 24" fill="#FFC107" width="120" height="24">
                                                <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M36 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M60 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M84 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M108 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                            </svg>
                                            <p>(324)</p>
                                        </div>
                                        {/* Price and button add to cart */}
                                        <div className='mt-5 flex items-center justify-between'>
                                            <div className='w-2/3 text-xl font-bold text-orange-400'>2.890.000đ</div>
                                            <button className='w-1/3 bg-orange-400 hover:bg-orange-500 hover:cursor-pointer flex items-center justify-center w-1/5 text-white font-bold rounded-md'>+ Giỏ</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Discount */}
                    <div className='p-10'>
                        <div className='m-10 p-10 bg-orange-400 text-white rounded-2xl'>
                            <p className='font-bold'>Ưu đãi đặc biệt</p>

                            <div className='flex items-center justify-between mt-4'>
                                <p className='text-3xl font-bold'>
                                    Giảm đến 30% cho <br/>
                                    Đơn hàng đầu tiên
                                </p>
                                <button className='bg-white text-orange-400 p-4 rounded-xl font-bold pr-5 pl-5'>Mua ngay</button>
                            </div>

                            <p className='mt-4'>Sử dụng mã: <span className='p-1 pl-2 pr-2 bg-orange-500 font-bold rounded-xl'>WELCOME30</span></p>
                        </div>
                    </div>

                    {/* Best Seller */}
                    <div className='p-10'>
                        <p className='text-2xl font-bold pl-10 pr-10'>Bán chạy nhất</p>

                        <div className='flex gap-4 mt-4 grid grid-cols-5 pl-10 pr-10'>
                            <div className='hover:shadow-md hover:scale-105 transition duration-300 col-span-1 rounded-xl bg-white'>
                                <img className=' rounded-t-xl' src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format" alt="" />
                                <div className='mt-4 p-3'>
                                    {/* Brand */}
                                    <p className='text-xs font-bold text-blue-500 bg-blue-100 rounded-xl w-1/6 flex items-center justify-center p-2'>Nike</p>
                                    <div className='mt-4'>
                                        {/* Product Name */}
                                        <p>Air Max 270 React</p>
                                        {/* Rate */}
                                        <div className='flex items-center gap-2'>
                                            <svg className='w-12 h-12' xmlns="http://w3.org" viewBox="0 0 120 24" fill="#FFC107" width="120" height="24">
                                                <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M36 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M60 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M84 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M108 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                            </svg>
                                            <p>(324)</p>
                                        </div>
                                        {/* Price and button add to cart */}
                                        <div className='mt-5 flex items-center justify-between'>
                                            <div className='w-2/3 text-xl font-bold text-orange-400'>2.890.000đ</div>
                                            <button className='w-1/3 bg-orange-400 hover:bg-orange-500 hover:cursor-pointer flex items-center justify-center w-1/5 text-white font-bold rounded-md'>+ Giỏ</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                           <div className='hover:shadow-md hover:scale-105 transition duration-300 col-span-1 rounded-xl bg-white'>
                                <img className=' rounded-t-xl' src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format" alt="" />
                                <div className='mt-4 p-3'>
                                    {/* Brand */}
                                    <p className='text-xs font-bold text-blue-500 bg-blue-100 rounded-xl w-1/6 flex items-center justify-center p-2'>Nike</p>
                                    <div className='mt-4'>
                                        {/* Product Name */}
                                        <p>Air Max 270 React</p>
                                        {/* Rate */}
                                        <div className='flex items-center gap-2'>
                                            <svg className='w-12 h-12' xmlns="http://w3.org" viewBox="0 0 120 24" fill="#FFC107" width="120" height="24">
                                                <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M36 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M60 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M84 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M108 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                            </svg>
                                            <p>(324)</p>
                                        </div>
                                        {/* Price and button add to cart */}
                                        <div className='mt-5 flex items-center justify-between'>
                                            <div className='w-2/3 text-xl font-bold text-orange-400'>2.890.000đ</div>
                                            <button className='w-1/3 bg-orange-400 hover:bg-orange-500 hover:cursor-pointer flex items-center justify-center w-1/5 text-white font-bold rounded-md'>+ Giỏ</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                           <div className='hover:shadow-md hover:scale-105 transition duration-300 col-span-1 rounded-xl bg-white'>
                                <img className=' rounded-t-xl' src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format" alt="" />
                                <div className='mt-4 p-3'>
                                    {/* Brand */}
                                    <p className='text-xs font-bold text-blue-500 bg-blue-100 rounded-xl w-1/6 flex items-center justify-center p-2'>Nike</p>
                                    <div className='mt-4'>
                                        {/* Product Name */}
                                        <p>Air Max 270 React</p>
                                        {/* Rate */}
                                        <div className='flex items-center gap-2'>
                                            <svg className='w-12 h-12' xmlns="http://w3.org" viewBox="0 0 120 24" fill="#FFC107" width="120" height="24">
                                                <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M36 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M60 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M84 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M108 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                            </svg>
                                            <p>(324)</p>
                                        </div>
                                        {/* Price and button add to cart */}
                                        <div className='mt-5 flex items-center justify-between'>
                                            <div className='w-2/3 text-xl font-bold text-orange-400'>2.890.000đ</div>
                                            <button className='w-1/3 bg-orange-400 hover:bg-orange-500 hover:cursor-pointer flex items-center justify-center w-1/5 text-white font-bold rounded-md'>+ Giỏ</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                           <div className='hover:shadow-md hover:scale-105 transition duration-300 col-span-1 rounded-xl bg-white'>
                                <img className=' rounded-t-xl' src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format" alt="" />
                                <div className='mt-4 p-3'>
                                    {/* Brand */}
                                    <p className='text-xs font-bold text-blue-500 bg-blue-100 rounded-xl w-1/6 flex items-center justify-center p-2'>Nike</p>
                                    <div className='mt-4'>
                                        {/* Product Name */}
                                        <p>Air Max 270 React</p>
                                        {/* Rate */}
                                        <div className='flex items-center gap-2'>
                                            <svg className='w-12 h-12' xmlns="http://w3.org" viewBox="0 0 120 24" fill="#FFC107" width="120" height="24">
                                                <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M36 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M60 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M84 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M108 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                            </svg>
                                            <p>(324)</p>
                                        </div>
                                        {/* Price and button add to cart */}
                                        <div className='mt-5 flex items-center justify-between'>
                                            <div className='w-2/3 text-xl font-bold text-orange-400'>2.890.000đ</div>
                                            <button className='w-1/3 bg-orange-400 hover:bg-orange-500 hover:cursor-pointer flex items-center justify-center w-1/5 text-white font-bold rounded-md'>+ Giỏ</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                           <div className='hover:shadow-md hover:scale-105 transition duration-300 col-span-1 rounded-xl bg-white'>
                                <img className=' rounded-t-xl' src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format" alt="" />
                                <div className='mt-4 p-3'>
                                    {/* Brand */}
                                    <p className='text-xs font-bold text-blue-500 bg-blue-100 rounded-xl w-1/6 flex items-center justify-center p-2'>Nike</p>
                                    <div className='mt-4'>
                                        {/* Product Name */}
                                        <p>Air Max 270 React</p>
                                        {/* Rate */}
                                        <div className='flex items-center gap-2'>
                                            <svg className='w-12 h-12' xmlns="http://w3.org" viewBox="0 0 120 24" fill="#FFC107" width="120" height="24">
                                                <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M36 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M60 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M84 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M108 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                            </svg>
                                            <p>(324)</p>
                                        </div>
                                        {/* Price and button add to cart */}
                                        <div className='mt-5 flex items-center justify-between'>
                                            <div className='w-2/3 text-xl font-bold text-orange-400'>2.890.000đ</div>
                                            <button className='w-1/3 bg-orange-400 hover:bg-orange-500 hover:cursor-pointer flex items-center justify-center w-1/5 text-white font-bold rounded-md'>+ Giỏ</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                           <div className='hover:shadow-md hover:scale-105 transition duration-300 col-span-1 rounded-xl bg-white'>
                                <img className=' rounded-t-xl' src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format" alt="" />
                                <div className='mt-4 p-3'>
                                    {/* Brand */}
                                    <p className='text-xs font-bold text-blue-500 bg-blue-100 rounded-xl w-1/6 flex items-center justify-center p-2'>Nike</p>
                                    <div className='mt-4'>
                                        {/* Product Name */}
                                        <p>Air Max 270 React</p>
                                        {/* Rate */}
                                        <div className='flex items-center gap-2'>
                                            <svg className='w-12 h-12' xmlns="http://w3.org" viewBox="0 0 120 24" fill="#FFC107" width="120" height="24">
                                                <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M36 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M60 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M84 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M108 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                            </svg>
                                            <p>(324)</p>
                                        </div>
                                        {/* Price and button add to cart */}
                                        <div className='mt-5 flex items-center justify-between'>
                                            <div className='w-2/3 text-xl font-bold text-orange-400'>2.890.000đ</div>
                                            <button className='w-1/3 bg-orange-400 hover:bg-orange-500 hover:cursor-pointer flex items-center justify-center w-1/5 text-white font-bold rounded-md'>+ Giỏ</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                           <div className='hover:shadow-md hover:scale-105 transition duration-300 col-span-1 rounded-xl bg-white'>
                                <img className=' rounded-t-xl' src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format" alt="" />
                                <div className='mt-4 p-3'>
                                    {/* Brand */}
                                    <p className='text-xs font-bold text-blue-500 bg-blue-100 rounded-xl w-1/6 flex items-center justify-center p-2'>Nike</p>
                                    <div className='mt-4'>
                                        {/* Product Name */}
                                        <p>Air Max 270 React</p>
                                        {/* Rate */}
                                        <div className='flex items-center gap-2'>
                                            <svg className='w-12 h-12' xmlns="http://w3.org" viewBox="0 0 120 24" fill="#FFC107" width="120" height="24">
                                                <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M36 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M60 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M84 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M108 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                            </svg>
                                            <p>(324)</p>
                                        </div>
                                        {/* Price and button add to cart */}
                                        <div className='mt-5 flex items-center justify-between'>
                                            <div className='w-2/3 text-xl font-bold text-orange-400'>2.890.000đ</div>
                                            <button className='w-1/3 bg-orange-400 hover:bg-orange-500 hover:cursor-pointer flex items-center justify-center w-1/5 text-white font-bold rounded-md'>+ Giỏ</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                           <div className='hover:shadow-md hover:scale-105 transition duration-300 col-span-1 rounded-xl bg-white'>
                                <img className=' rounded-t-xl' src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format" alt="" />
                                <div className='mt-4 p-3'>
                                    {/* Brand */}
                                    <p className='text-xs font-bold text-blue-500 bg-blue-100 rounded-xl w-1/6 flex items-center justify-center p-2'>Nike</p>
                                    <div className='mt-4'>
                                        {/* Product Name */}
                                        <p>Air Max 270 React</p>
                                        {/* Rate */}
                                        <div className='flex items-center gap-2'>
                                            <svg className='w-12 h-12' xmlns="http://w3.org" viewBox="0 0 120 24" fill="#FFC107" width="120" height="24">
                                                <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M36 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M60 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M84 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                                <path d="M108 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.399 8.168-7.333-3.854-7.333 3.854 1.399-8.168-5.934-5.787 8.2-1.192z"/>
                                            </svg>
                                            <p>(324)</p>
                                        </div>
                                        {/* Price and button add to cart */}
                                        <div className='mt-5 flex items-center justify-between'>
                                            <div className='w-2/3 text-xl font-bold text-orange-400'>2.890.000đ</div>
                                            <button className='w-1/3 bg-orange-400 hover:bg-orange-500 hover:cursor-pointer flex items-center justify-center w-1/5 text-white font-bold rounded-md'>+ Giỏ</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/*  */}
                    <div className='bg-white'>   
                        <div className='p-10 grid grid-cols-4 gap-3'>
                            <div className='col-span-1 flex items-center justify-center gap-3'>
                                <svg className='w-8 h-8' xmlns="http://w3.org" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="1" y="3" width="15" height="13"></rect>
                                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                                    <circle cx="5.5" cy="18.5" r="2.5"></circle>
                                    <circle cx="18.5" cy="18.5" r="2.5"></circle>
                                </svg>
                                <div>
                                    <p  className='font-bold'>Miễn phí vận chuyển</p>
                                    <p className='text-xs text-gray-500'>Cho đơn từ 500.000đ</p>
                                </div>
                            </div>

                            <div className='col-span-1 flex items-center justify-center gap-3'>
                                <svg className='w-8 h-8' xmlns="http://w3.org" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                                </svg>
                                <div>
                                    <p  className='font-bold'>Đổi trả dễ dàng</p>
                                    <p className='text-xs text-gray-500'>30 ngày không điều kiện</p>
                                </div>
                            </div>

                            <div className='col-span-1 flex items-center justify-center gap-3'>
                                <svg className='w-8 h-8' xmlns="http://w3.org" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                <div>
                                    <p  className='font-bold'>Hàng chính hãng</p>
                                    <p className='text-xs text-gray-500'>100% xác thực</p>
                                </div>
                            </div>

                            <div className='col-span-1 flex items-center justify-center gap-3'>
                                <svg className='w-8 h-8' xmlns="http://w3.org" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                                </svg>
                                <div>
                                    <p  className='font-bold'>Thanh toán an toàn</p>
                                    <p className='text-xs text-gray-500'>Mã hóa SSL</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <Footer/>
        </div>
    );
}

export default HomePage;