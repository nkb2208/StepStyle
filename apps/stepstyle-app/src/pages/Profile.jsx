import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../layouts/Footer";
import NavBar from "../layouts/NavBar";
import {
    avatarSrc,
    getMembership,
    getProfile,
    updateProfile,
    uploadAvatar,
} from "../services/loyaltyService";
import AddressBook from "../components/profile/AddressBook";
import VipPanel from "../components/profile/VipPanel";

function Profile(){
    const navigate = useNavigate();
    const fileRef = useRef(null);
    const [profile, setProfile] = useState(null);
    const [membership, setMembership] = useState(null);
    const [form, setForm] = useState({ ho_ten: "", so_dien_thoai: "" });
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);

    const handleError = (err) => {
        console.error("Profile error:", err);
        if (err.response?.status === 401) {
            navigate("/login"); // chưa đăng nhập hoặc token hết hạn (15 phút)
            return;
        }
        if (err.response?.status === 422) {
            setMessage("Dữ liệu chưa hợp lệ (số điện thoại cần dạng 0xxxxxxxxx)");
            return;
        }
        setMessage(err.response?.data?.error?.message || "Không kết nối được máy chủ");
    };

    useEffect(() => {
        Promise.all([getProfile(), getMembership()])
            .then(([p, m]) => {
                setProfile(p);
                setMembership(m);
                setForm({ ho_ten: p.ho_ten || "", so_dien_thoai: p.so_dien_thoai || "" });
            })
            .catch(handleError)
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setMessage("");
        const payload = { ho_ten: form.ho_ten.trim() };
        if (form.so_dien_thoai.trim()) payload.so_dien_thoai = form.so_dien_thoai.trim();
        try {
            setProfile(await updateProfile(payload));
            setMessage("Đã lưu thay đổi");
        } catch (err) {
            handleError(err);
        }
    };

    const handleAvatar = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            setMessage("Ảnh tối đa 2MB");
            return;
        }
        try {
            setProfile(await uploadAvatar(file));
            setMessage("Đã đổi ảnh đại diện");
        } catch (err) {
            handleError(err);
        }
    };

    if (loading) {
        return <p className="p-10 text-center text-gray-500">Đang tải hồ sơ...</p>;
    }
    return(
        <div className="min-h-screen bg-gray-100">
            <div>
                <NavBar/>
            </div>

            <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
                <div>
                    <p className="text-2xl sm:text-3xl font-bold">Hồ sơ của tôi</p>

                    <div className="flex flex-col sm:flex-row items-center text-center sm:text-left mt-4 p-5 sm:px-8 gap-4 bg-white rounded-xl shadow-2xs">
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={handleAvatar}
                        />
                        <div
                            onClick={() => fileRef.current?.click()}
                            title="Bấm để đổi ảnh đại diện"
                            className="cursor-pointer flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 shrink-0 overflow-hidden text-3xl font-bold text-orange-400 rounded-xl bg-orange-100"
                        >
                            {profile?.avatar_url ? (
                                <img src={avatarSrc(profile.avatar_url)} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                                (profile?.ho_ten || "?").charAt(0).toUpperCase()
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xl sm:text-2xl font-bold truncate">{profile?.ho_ten}</p>
                            <p className="text-sm sm:text-base text-gray-500 break-all">{profile?.email}</p>
                            <p className="mt-2 inline-block px-3 py-1 text-xs sm:text-sm font-medium text-orange-500 bg-orange-100 rounded-xl">
                                Hạng {membership?.ten_hang}
                                {membership?.phan_tram_giam > 0 && ` · giảm ${membership.phan_tram_giam}%`}
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 p-5 sm:px-8 bg-white rounded-xl shadow-2xs">
                        <p className="font-bold">Thông tin cá nhân</p>

                        <form className="mt-4" onSubmit={handleSave}>
                            <div className='mt-4'>
                                <label className="font-bold text-sm" htmlFor="">Họ và tên</label>
                                <input className="mt-2 border border-gray-300 rounded-xl p-3 text-sm sm:text-base w-full outline-none focus:border-orange-400" type="text" value={form.ho_ten} onChange={(e) => setForm({ ...form, ho_ten: e.target.value })} />
                            </div>

                            <div className='mt-4'>
                                <label className="font-bold text-sm" htmlFor="">Email</label>
                                <input className="mt-2 border border-gray-300 rounded-xl p-3 text-sm sm:text-base w-full bg-gray-100" type="email" value={profile?.email || ""} readOnly />
                                <p className="text-xs text-gray-500 mt-1.5">Email không thể thay đổi</p>
                            </div>

                            <div className='mt-4'>
                                <label className="font-bold text-sm" htmlFor="">Số điện thoại</label>
                                <input className="mt-2 border border-gray-300 rounded-xl p-3 text-sm sm:text-base w-full outline-none focus:border-orange-400" type="text" value={form.so_dien_thoai} onChange={(e) => setForm({ ...form, so_dien_thoai: e.target.value })} placeholder="0912345678" />
                            </div>

                            {message && <p className="mt-4 text-sm text-gray-600">{message}</p>}
                            <button className="mt-4 w-full sm:w-auto bg-orange-400 hover:bg-orange-500 rounded-xl px-5 py-2.5 font-bold text-white cursor-pointer">Lưu thay đổi</button>
                        </form>
                    </div>
                    <AddressBook />
                    <VipPanel onChanged={() => getMembership().then(setMembership)} />
                    <div className="mt-4 p-5 sm:px-8 bg-white rounded-xl shadow-2xs">
                        <p className="mb-2 font-bold text-red-500 text-lg sm:text-xl">Đăng xuất</p>

                        <p className="mb-4 text-sm sm:text-base text-gray-500">Bạn sẽ cần đăng nhập lại để tiếp tục mua sắm.</p>

                        <Link to='/login' className="inline-block bg-red-500 hover:bg-red-600 rounded-xl px-5 py-2.5 font-bold text-white">Đăng xuất</Link>
                    </div>
                </div>
            </div>


            <div>
                <Footer/>
            </div>
        </div>
    );
}


export default Profile;