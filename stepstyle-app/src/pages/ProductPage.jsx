import NavBar from "../layouts/NavBar";
import AllProduct from "../pages/products/AllProduct";
import Sneakers from "../pages/products/Sneakers";
import Boots from "../pages/products/Boots";
import Sandals from "../pages/products/Sandals";
import Heels from "../pages/products/Heels";
import Loafers from "../pages/products/Loafers";
import {Link, BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { useState } from "react";
function ProductPage(){
    const [switchPage, setSwitchPage] = useState('all');

    return(
        <div className="bg-gray-100 min-h-screen">
            {/* Nav Bar */}
            <div className="bg-white">
                <NavBar/>
            </div>
            
            {/* Body */}
            <div className="p-10">
                <div className="mr-10 ml-10">
                    <p className='text-2xl font-bold'>Tất cả sản phẩm</p>
                    <p className='text-gray-500'><span>12</span> sản phẩm</p>
                </div>

                <div className='flex mt-4 mr-10 ml-10'>
                    <div className='w-1/6'>
                        <div className="bg-white p-5 rounded-2xl">
                            <p className="text-md font-bold">Danh mục</p>
                            <div className=" p-1 grid grid-cols-1">
                                <Link to='/product/all' onClick={()=>setSwitchPage('all')} className={switchPage === 'all'?'transition duration-300 mt-4 p-2 pr-3 pl-3 bg-orange-400 text-white font-bold rounded-xl' :'mt-4 p-2 pr-3 pl-3 font-bold rounded-xl'}>
                                    Tất cả
                                </Link>

                                <Link to='/product/sneakers' onClick={()=>setSwitchPage('sneakers')} className={switchPage === 'sneakers'?'transition duration-300 mt-4 p-2 pr-3 pl-3 bg-orange-400 text-white font-bold rounded-xl' :'mt-4 p-2 pr-3 pl-3 font-bold rounded-xl'}>
                                    Sneaker
                                </Link>

                                <Link to='/product/boots' onClick={()=>setSwitchPage('boots')} className={switchPage === 'boots'?' transition duration-300 mt-4 p-2 pr-3 pl-3 bg-orange-400 text-white font-bold rounded-xl' :'mt-4 p-2 pr-3 pl-3 font-bold rounded-xl'}>
                                    Boots
                                </Link>

                                <Link to='/product/sandals' onClick={()=>setSwitchPage('sandals')} className={switchPage === 'sandals'?'transition duration-300 mt-4 p-2 pr-3 pl-3 bg-orange-400 text-white font-bold rounded-xl' :'mt-4 p-2 pr-3 pl-3 font-bold rounded-xl'}>
                                    Sandals
                                </Link>

                                <Link to='/product/heels' onClick={()=>setSwitchPage('heels')} className={switchPage === 'heels'?'transition duration-300 mt-4 p-2 pr-3 pl-3 bg-orange-400 text-white font-bold rounded-xl' :'mt-4 p-2 pr-3 pl-3 font-bold rounded-xl'}>
                                    Heels
                                </Link>

                                <Link to='/product/loafers' onClick={()=>setSwitchPage('loafers')} className={switchPage === 'loafers'?'transition duration-300 mt-4 p-2 pr-3 pl-3 bg-orange-400 text-white font-bold rounded-xl' :'mt-4 p-2 pr-3 pl-3 font-bold rounded-xl'}>
                                    Loafers
                                </Link>
                            </div>

                            <p className="mt-4 text-md font-bold">Giá tối đa</p>
                        </div>
                        
                    </div>

                    <div className='w-5/6'>
                        <Routes>
                            <Route path="/" element={<AllProduct />} />
                            <Route path="/all" element={<AllProduct/>} />
                            <Route path='/sneakers' element= {<Sneakers/>}/>
                            <Route path="/boots" element={<Boots />} />
                            <Route path="/sandals" element= {<Sandals/>}/>
                            <Route path="/heels" element={<Heels />} />
                            <Route path="/loafers" element= {<Loafers/>}/>
                        </Routes>
                    </div>
                </div>
            </div>
        </div>
    );
}


export default ProductPage;