import Footer from "../layouts/Footer";
import NavBar from "../layouts/NavBar";

function Rating(){
    return(
        <div className="relative min-h-screen">
            <div>
                <NavBar />      
            </div>

            {/* Body */}
            <div className="flex p-10 gap-3">
                <div className="w-2/5">
                    <p className="text-3xl text-orange-400">Reviews</p>

                    {/*Total rating */}

                    <div className="flex items-center gap-3">
                        <svg xmlns="http://w3.org" viewBox="0 0 120 22" width="120" height="22" fill="#FBBF24" aria-label="5 out of 5 stars" role="img">
                            <polygon points="11,1 13.9,7.1 20.5,8 15.7,12.6 16.9,19.2 11,16 5.1,19.2 6.3,12.6 1.5,8 8.1,7.1" />
                            <polygon points="35,1 37.9,7.1 44.5,8 39.7,12.6 40.9,19.2 35,16 29.1,19.2 30.3,12.6 25.5,8 32.1,7.1" />
                            <polygon points="59,1 61.9,7.1 68.5,8 63.7,12.6 64.9,19.2 59,16 53.1,19.2 54.3,12.6 49.5,8 56.1,7.1" />
                            <polygon points="83,1 85.9,7.1 92.5,8 87.7,12.6 88.9,19.2 83,16 77.1,19.2 78.3,12.6 73.5,8 80.1,7.1" />
                            <polygon points="107,1 109.9,7.1 116.5,8 111.7,12.6 112.9,19.2 107,16 101.1,19.2 102.3,12.6 97.5,8 104.1,7.1" />
                        </svg>
                        <p className="text-3xl font-bold">5.0</p>
                    </div>

                    {/* Image */}
                    <div className='mt-4 w-full lg:w-1/2'>
                        <img className='rounded-2xl sm:rounded-3xl w-full h-64 sm:h-96 lg:h-auto object-cover' src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop&auto=format" alt="StepStyle Hero" />
                    </div>


                    <div className="mt-4">
                        {/* Five Stars */}
                        <div className="flex items-center gap-3 mt-3">
                            <svg xmlns="http://w3.org" viewBox="0 0 120 22" width="120" height="22" fill="#FBBF24" aria-label="5 out of 5 stars" role="img">
                                <polygon points="11,1 13.9,7.1 20.5,8 15.7,12.6 16.9,19.2 11,16 5.1,19.2 6.3,12.6 1.5,8 8.1,7.1" />
                                <polygon points="35,1 37.9,7.1 44.5,8 39.7,12.6 40.9,19.2 35,16 29.1,19.2 30.3,12.6 25.5,8 32.1,7.1" />
                                <polygon points="59,1 61.9,7.1 68.5,8 63.7,12.6 64.9,19.2 59,16 53.1,19.2 54.3,12.6 49.5,8 56.1,7.1" />
                                <polygon points="83,1 85.9,7.1 92.5,8 87.7,12.6 88.9,19.2 83,16 77.1,19.2 78.3,12.6 73.5,8 80.1,7.1" />
                                <polygon points="107,1 109.9,7.1 116.5,8 111.7,12.6 112.9,19.2 107,16 101.1,19.2 102.3,12.6 97.5,8 104.1,7.1" />
                            </svg>

                            <p>100%</p>

                            <div className="w-full bg-orange-500 rounded-full h-1.5">
                                <div className="bg-brand h-1.5 rounded-full w-full"></div>
                            </div>
                        </div>

                        {/* Four Stars */}
                        <div className="flex items-center gap-3 mt-3">
                            <svg xmlns="http://w3.org" viewBox="0 0 130 24" width="120" height="22" role="img" aria-label="4 out of 5 stars">
                                <defs>
                                    <polygon id="star" points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                                </defs>
                                <use href="#star" x="0" fill="#FBBF24" />
                                <use href="#star" x="26" fill="#FBBF24" />
                                <use href="#star" x="52" fill="#FBBF24" />
                                <use href="#star" x="78" fill="#FBBF24" />
                                <use href="#star" x="104" fill="#E5E7EB" />
                            </svg>

                            <p>0%</p>

                            <div className="w-full bg-gray-500 rounded-full h-1.5">
                                <div className="bg-brand h-1.5 rounded-full w-full"></div>
                            </div>
                        </div>

                        {/* Three Stars */}
                        <div className="flex items-center gap-3 mt-3">
                            <svg xmlns="http://w3.org" viewBox="0 0 130 24" width="120" height="22" role="img" aria-label="Đánh giá 3 trên 5 sao">
                                <defs>
                                    <polygon id="star" points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                                </defs>
                                <use href="#star" x="0" fill="#FBBF24" />
                                <use href="#star" x="26" fill="#FBBF24" />
                                <use href="#star" x="52" fill="#FBBF24" />
                                <use href="#star" x="78" fill="#D1D5DB" />
                                <use href="#star" x="104" fill="#D1D5DB" />
                            </svg>

                            <p>0%</p>

                            <div className="w-full bg-gray-500 rounded-full h-1.5">
                                <div className="bg-brand h-1.5 rounded-full w-full"></div>
                            </div>
                        </div>

                        {/* Two Stars */}
                        <div className="flex items-center gap-3 mt-3">
                            <svg xmlns="http://w3.org" viewBox="0 0 130 24" width="120" height="22" role="img" aria-label="Đánh giá 3 trên 5 sao">
                                <defs>
                                    <polygon id="star" points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                                </defs>
                                <use href="#star" x="0" fill="#FBBF24" />
                                <use href="#star" x="26" fill="#FBBF24" />
                                <use href="#star" x="52" fill="#D1D5DB" />
                                <use href="#star" x="78" fill="#D1D5DB" />
                                <use href="#star" x="104" fill="#D1D5DB" />
                            </svg>

                            <p>0%</p>

                            <div className="w-full bg-gray-500 rounded-full h-1.5">
                                <div className="bg-brand h-1.5 rounded-full w-full"></div>
                            </div>
                        </div>

                        {/* One Star */}
                        <div className="flex items-center gap-3 mt-3">
                            <svg xmlns="http://w3.org" viewBox="0 0 130 24" width="120" height="22" role="img" aria-label="Đánh giá 3 trên 5 sao">
                                <defs>
                                    <polygon id="star" points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                                </defs>
                                <use href="#star" x="0" fill="#FBBF24" />
                                <use href="#star" x="26" fill="#D1D5DB" />
                                <use href="#star" x="52" fill="#D1D5DB" />
                                <use href="#star" x="78" fill="#D1D5DB" />
                                <use href="#star" x="104" fill="#D1D5DB" />
                            </svg>

                            <p>0%</p>

                            <div className="w-full bg-gray-500 rounded-full h-1.5">
                                <div className="bg-brand h-1.5 rounded-full w-full"></div>
                            </div>
                        </div>

                    </div>
                </div>

                <div className="w-3/5 p-5">
                    <p>Bạn có hài lòng về sản phẩm của chúng tôi? Hãy đánh giá ngay.</p>
                    <form action="">
                        <svg className="mt-4" xmlns="http://w3.org" viewBox="0 0 130 24" width="120" height="22" role="img" aria-label="Đánh giá 3 trên 5 sao">
                            <defs>
                                <polygon id="star" points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                            </defs>
                            <use href="#star" x="0" fill="#D1D5DB" />
                            <use href="#star" x="26" fill="#D1D5DB" />
                            <use href="#star" x="52" fill="#D1D5DB" />
                            <use href="#star" x="78" fill="#D1D5DB" />
                            <use href="#star" x="104" fill="#D1D5DB" />
                        </svg>

                        <div className="mt-4">
                            <label htmlFor="">Bạn thích hay không thích sản phẩm ở điểm nào?</label>
                            <textarea rows="4" cols="50" className="mt-2 border border-orange-300 rounded-xl p-3 w-full" type="text" />
                        </div>

                        <div>
                            <label for="upload-image"
                                className="flex h-32 w-36 cursor-pointer items-center 
                                    justify-center rounded-2xl border-2 
                                    transition-colors hover:bg-blue-50">

                                <div className="flex h-24 w-24 items-center justify-center
                                            border-2 border-dashed border-gray-400">

                                    <svg xmlns="http://www.w3.org/2000/svg"
                                        class="h-10 w-10 text-gray-800"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        stroke-width="1.3"
                                        stroke-linecap="round"
                                        stroke-linejoin="round">

                                        <path d="M12 16V9" />
                                        <path d="m8 13 4-4 4 4" />
                                        <path d="M20 16.6A5 5 0 0 0 18 7
                                                A7 7 0 1 0 4 16.6" />
                                    </svg>

                                </div>

                                <input type="file"
                                    id="upload-image"
                                    name="images"
                                    accept="image/*"
                                    multiple
                                    class="hidden" />
                            </label>
                        </div>

                        <div className="w-full flex items-center justify-end gap-3">
                            <button className="cursor-pointer p-3 pr-5 pl-5 bg-gray-300 rounded-xl">Hủy</button>
                            <button className="cursor-pointer p-3 pr-5 pl-5 bg-orange-400 text-white rounded-xl">Gửi đánh giá</button>
                        </div>
                    </form>
                </div>
            </div>


            <div className="mt-auto">
                <Footer/>
            </div>

        </div>
    );
}


export default Rating;