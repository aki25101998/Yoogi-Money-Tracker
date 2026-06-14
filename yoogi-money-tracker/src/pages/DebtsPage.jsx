import React, { useState } from 'react';
import { Users, Plus, ArrowDownToLine, ArrowUpFromLine, Search, ChevronRight, Coins, Trash2 } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import AddDebtModal from '../components/modals/AddDebtModal';
import RepayDebtModal from '../components/modals/RepayDebtModal';
import { addDebtor, deleteDebtor } from '../utils/firebaseHelpers';

const DebtsPage = ({ user, debts, wallets, categories, payers }) => {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isRepayOpen, setIsRepayOpen] = useState(false);
    const [selectedDebtId, setSelectedDebtId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('active');
    const [activeTab, setActiveTab] = useState('debts');

    const totalLent = debts.reduce((acc, d) => d.status === 'active' ? acc + (d.totalAmount - (d.repaidAmount || 0)) : acc, 0);
    const totalRepaid = debts.reduce((acc, d) => acc + (d.repaidAmount || 0), 0);

    const filteredDebts = debts.filter(d => {
        const matchSearch = d.personName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = filterStatus === 'all' || d.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const openRepayModal = (id) => {
        setSelectedDebtId(id);
        setIsRepayOpen(true);
    };

    const handleQuickAddPayer = async () => {
        const name = window.prompt('Nhập tên người mượn mới:');
        if (name && name.trim()) {
            try {
                await addDebtor(user.uid, { name: name.trim() });
                return name.trim();
            } catch (error) {
                alert('Lỗi: ' + error.message);
            }
        }
        return null;
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Users className="w-7 h-7 text-emerald-500" />
                        Sổ Nợ
                    </h1>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl self-start md:self-auto">
                    <button
                        onClick={() => setActiveTab('debts')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'debts' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        Khoản nợ
                    </button>
                    <button
                        onClick={() => setActiveTab('debtors')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'debtors' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        Người mượn
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    {activeTab === 'debts' ? (
                        <button
                            onClick={() => setIsAddOpen(true)}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-800 dark:bg-emerald-600 hover:bg-slate-700 dark:hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-slate-200 dark:shadow-emerald-900/20 active:scale-95"
                        >
                            <Plus className="w-5 h-5" />
                            Cho mượn mới
                        </button>
                    ) : (
                        <button
                            onClick={handleQuickAddPayer}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 active:scale-95"
                        >
                            <Plus className="w-5 h-5" />
                            Thêm người mượn
                        </button>
                    )}
                </div>
            </div>

            {activeTab === 'debts' ? (
                <>
                    {/* Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg shadow-orange-200 dark:shadow-none relative overflow-hidden group">
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <ArrowUpFromLine className="w-5 h-5 opacity-80" />
                                    <h3 className="font-medium opacity-90 text-sm uppercase tracking-wider">Tổng tiền đang cho mượn</h3>
                                </div>
                                <div className="text-3xl font-bold">{formatCurrency(totalLent)}</div>
                                <p className="text-orange-100 text-sm mt-2 opacity-80">Tiền đang nằm ở người khác</p>
                            </div>
                            <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                <Coins className="w-40 h-40" />
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-200 dark:shadow-none relative overflow-hidden group">
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <ArrowDownToLine className="w-5 h-5 opacity-80" />
                                    <h3 className="font-medium opacity-90 text-sm uppercase tracking-wider">Tổng tiền đã thu hồi</h3>
                                </div>
                                <div className="text-3xl font-bold">{formatCurrency(totalRepaid)}</div>
                                <p className="text-emerald-100 text-sm mt-2 opacity-80">Tổng tiền đã được trả lại</p>
                            </div>
                            <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                <Users className="w-40 h-40" />
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Tìm khoản nợ..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100"
                            />
                        </div>
                        <div className="flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
                            <button
                                onClick={() => setFilterStatus('active')}
                                className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'active' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            >
                                Đang nợ
                            </button>
                            <button
                                onClick={() => setFilterStatus('paid')}
                                className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'paid' ? 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            >
                                Đã trả xong
                            </button>
                            <button
                                onClick={() => setFilterStatus('all')}
                                className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'all' ? 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            >
                                Tất cả
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    {filteredDebts.length === 0 ? (
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-10 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
                                <Users className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Không tìm thấy khoản cho mượn nào.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredDebts.map(debt => {
                                const progress = Math.min(100, Math.round(((debt.repaidAmount || 0) / debt.totalAmount) * 100));
                                const remaining = debt.totalAmount - (debt.repaidAmount || 0);

                                return (
                                    <div key={debt.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                        {debt.status === 'paid' && (
                                            <div className="absolute top-4 right-4 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                Đã trả xong
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm ${debt.status === 'paid' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                                                {debt.personName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800 dark:text-white text-lg">{debt.personName}</h3>
                                                <p className="text-xs text-slate-500">{new Date(debt.createdAt).toLocaleDateString('vi-VN')}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-sm text-slate-500">Đã mượn</span>
                                                <span className="font-bold text-slate-800 dark:text-white text-lg">{formatCurrency(debt.totalAmount)}</span>
                                            </div>

                                            <div>
                                                <div className="flex justify-between text-xs mb-1.5">
                                                    <span className="font-medium text-emerald-600 dark:text-emerald-400">Đã trả: {formatCurrency(debt.repaidAmount || 0)}</span>
                                                    <span className="font-medium text-slate-500">{progress}%</span>
                                                </div>
                                                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                                                    <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                                </div>
                                            </div>

                                            {debt.status === 'active' && (
                                                <div className="pt-2 flex gap-2 border-t border-slate-100 dark:border-slate-700">
                                                    <div className="flex-1">
                                                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-0.5">Còn nợ</span>
                                                        <span className="font-bold text-orange-500">{formatCurrency(remaining)}</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => openRepayModal(debt.id)}
                                                        className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl font-bold text-sm transition-colors flex items-center gap-1"
                                                    >
                                                        Nhận trả
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {payers.length === 0 ? (
                        <div className="col-span-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-10 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
                                <Users className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Chưa có người mượn nào.</p>
                        </div>
                    ) : (
                        payers.map(payer => (
                            <div key={payer.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-lg">
                                        {payer.name.charAt(0).toUpperCase()}
                                    </div>
                                    <h3 className="font-bold text-slate-800 dark:text-white">{payer.name}</h3>
                                </div>
                                <button
                                    onClick={async () => {
                                        if (window.confirm(`Xóa người mượn "${payer.name}"?\n(Các khoản nợ cũ vẫn sẽ được giữ lại)`)) {
                                            try {
                                                await deleteDebtor(user.uid, payer.id);
                                            } catch(err) {
                                                alert("Lỗi: " + err.message);
                                            }
                                        }
                                    }}
                                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}

            <AddDebtModal
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                user={user}
                wallets={wallets}
                payers={payers}
                onAddPayer={handleQuickAddPayer}
            />

            {selectedDebtId && (
                <RepayDebtModal
                    isOpen={isRepayOpen}
                    onClose={() => { setIsRepayOpen(false); setSelectedDebtId(null); }}
                    user={user}
                    wallets={wallets}
                    debt={debts.find(d => d.id === selectedDebtId)}
                />
            )}
        </div>
    );
};

export default DebtsPage;
