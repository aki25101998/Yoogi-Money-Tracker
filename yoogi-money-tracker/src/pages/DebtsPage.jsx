import React, { useState } from 'react';
import { Users, Plus, ArrowDownToLine, ArrowUpFromLine, Search, ChevronRight, Coins, Trash2 } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import AddDebtModal from '../components/modals/AddDebtModal';
import RepayDebtModal from '../components/modals/RepayDebtModal';
import DebtDetailsModal from '../components/modals/DebtDetailsModal';
import { addDebtor, deleteDebtor, deleteDebt, updateDebt, updateDebtor } from '../utils/firebaseHelpers';

const DebtsPage = ({ user, debts, wallets, categories, payers }) => {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isRepayOpen, setIsRepayOpen] = useState(false);
    const [selectedDebtId, setSelectedDebtId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('active');
    const [activeTab, setActiveTab] = useState('debts');
    const [selectedGroupKey, setSelectedGroupKey] = useState(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [selectedDetailsKey, setSelectedDetailsKey] = useState(null);

    const totalLent = debts.reduce((acc, d) => d.status === 'active' ? acc + (d.totalAmount - (d.repaidAmount || 0)) : acc, 0);
    const totalRepaid = debts.reduce((acc, d) => acc + (d.repaidAmount || 0), 0);

    const groupedDebtsObj = debts.reduce((acc, d) => {
        const key = d.personName.trim().toLowerCase();
        if (!acc[key]) {
            acc[key] = {
                id: key,
                personName: d.personName,
                totalAmount: 0,
                repaidAmount: 0,
                debts: [],
                status: 'paid',
                createdAt: d.createdAt,
            };
        }
        
        if (d.status === 'active') {
            acc[key].totalAmount += d.totalAmount;
            acc[key].repaidAmount += (d.repaidAmount || 0);
            acc[key].status = 'active';
        }
        
        acc[key].debts.push(d);
        if (new Date(d.createdAt) > new Date(acc[key].createdAt)) {
            acc[key].createdAt = d.createdAt;
            acc[key].personName = d.personName;
        }
        return acc;
    }, {});

    const groupedDebtsArray = Object.values(groupedDebtsObj);

    const filteredGroups = groupedDebtsArray.filter(g => {
        const matchSearch = g.personName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = filterStatus === 'all' || g.status === filterStatus;
        return matchSearch && matchStatus;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const openRepayModal = (key) => {
        setSelectedGroupKey(key);
        setIsRepayOpen(true);
    };

    const openDetailsModal = (key) => {
        setSelectedDetailsKey(key);
        setIsDetailsOpen(true);
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

    const handleDeleteDebt = async (debtId) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa khoản nợ này? Hành động này không thể hoàn tác.')) {
            try {
                await deleteDebt(user.uid, debtId);
            } catch (error) {
                alert('Lỗi khi xóa: ' + error.message);
            }
        }
    };

    const handleDeleteGroup = async (group) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa TOÀN BỘ nợ của "${group.personName}"?\nHành động này sẽ xóa ${group.debts.length} khoản nợ và không thể hoàn tác.`)) {
            try {
                await Promise.all(group.debts.map(d => deleteDebt(user.uid, d.id)));
            } catch (error) {
                alert('Lỗi khi xóa: ' + error.message);
            }
        }
    };

    const handleEditGroup = async (group) => {
        const newName = window.prompt('Nhập tên người mượn mới:', group.personName);
        if (newName && newName.trim() && newName.trim() !== group.personName) {
            try {
                // Update all debts
                await Promise.all(group.debts.map(d => updateDebt(user.uid, d.id, { personName: newName.trim() })));
                
                // Try to update the debtor in 'debtors' collection if it exists
                const matchedDebtor = payers.find(p => p.name.trim().toLowerCase() === group.personName.trim().toLowerCase());
                if (matchedDebtor) {
                    await updateDebtor(user.uid, matchedDebtor.id, { name: newName.trim() });
                }
            } catch (error) {
                alert('Lỗi khi sửa tên: ' + error.message);
            }
        }
    };

    const handleEditDebtor = async (payer) => {
        const newName = window.prompt('Nhập tên người mượn mới:', payer.name);
        if (newName && newName.trim() && newName.trim() !== payer.name) {
            try {
                // Update the debtor
                await updateDebtor(user.uid, payer.id, { name: newName.trim() });
                
                // Update all debts that match the old name
                const oldKey = payer.name.trim().toLowerCase();
                if (groupedDebtsObj[oldKey]) {
                    const debtsToUpdate = groupedDebtsObj[oldKey].debts;
                    await Promise.all(debtsToUpdate.map(d => updateDebt(user.uid, d.id, { personName: newName.trim() })));
                }
            } catch (error) {
                alert('Lỗi khi sửa tên: ' + error.message);
            }
        }
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
                    {filteredGroups.length === 0 ? (
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-10 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
                                <Users className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Không tìm thấy khoản cho mượn nào.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredGroups.map(group => {
                                const remaining = group.totalAmount - group.repaidAmount;
                                const progress = group.totalAmount > 0 ? Math.round((group.repaidAmount / group.totalAmount) * 100) : 0;

                                return (
                                    <div 
                                        key={group.id} 
                                        className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group/card"
                                    >
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group); }}
                                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors z-10"
                                            title="Xóa toàn bộ nợ của người này"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                        
                                        <div 
                                            className="p-5 pb-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700"
                                            onClick={(e) => { e.stopPropagation(); handleEditGroup(group); }}
                                        >
                                            <div className="flex items-center gap-3 pr-10">
                                                <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-xl group-hover/card:bg-orange-200 transition-colors">
                                                    {group.personName.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-800 dark:text-white text-lg group-hover/card:text-emerald-600 transition-colors">{group.personName}</h3>
                                                    <p className="text-xs text-slate-500">Bấm để thay đổi thông tin</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div 
                                            className="p-5 pt-4 cursor-pointer flex-1 flex flex-col justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                            onClick={() => openDetailsModal(group.id)}
                                        >
                                            <div className="space-y-4">
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-sm text-slate-500">Đã mượn</span>
                                                <span className="font-bold text-slate-800 dark:text-white text-lg">{formatCurrency(group.totalAmount)}</span>
                                            </div>

                                            <div>
                                                <div className="flex justify-between text-xs mb-1.5">
                                                    <span className="font-medium text-emerald-600 dark:text-emerald-400">Đã trả: {formatCurrency(group.repaidAmount || 0)}</span>
                                                    <span className="font-medium text-slate-500">{progress}%</span>
                                                </div>
                                                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                                                    <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                                </div>
                                            </div>

                                            {group.status === 'active' && (
                                                <div className="pt-2 flex gap-2 border-t border-slate-100 dark:border-slate-700">
                                                    <div className="flex-1">
                                                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-0.5">Còn nợ</span>
                                                        <span className="font-bold text-orange-500">{formatCurrency(remaining)}</span>
                                                    </div>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); openRepayModal(group.id); }}
                                                        className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl font-bold text-sm transition-colors flex items-center gap-1"
                                                    >
                                                        Nhận trả
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
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
                                <Users className="w-10 h-10 text-slate-300 dark:bg-slate-600" />
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Chưa có người mượn nào.</p>
                        </div>
                    ) : (
                        payers.map(payer => (
                            <div 
                                key={payer.id} 
                                onClick={() => handleEditDebtor(payer)}
                                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm flex items-center justify-between group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:shadow-md transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-lg group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                        {payer.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{payer.name}</h3>
                                        <p className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity absolute mt-0.5">Bấm để sửa tên</p>
                                    </div>
                                </div>
                                <button
                                    onClick={async (e) => {
                                        e.stopPropagation();
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

            {isRepayOpen && selectedGroupKey && (
                <RepayDebtModal
                    isOpen={isRepayOpen}
                    onClose={() => { setIsRepayOpen(false); setSelectedGroupKey(null); }}
                    user={user}
                    wallets={wallets}
                    debt={groupedDebtsObj[selectedGroupKey]}
                />
            )}

            <DebtDetailsModal
                isOpen={isDetailsOpen}
                onClose={() => { setIsDetailsOpen(false); setSelectedDetailsKey(null); }}
                groupedDebt={groupedDebtsObj[selectedDetailsKey]}
                onDeleteDebt={handleDeleteDebt}
                user={user}
                wallets={wallets}
            />
        </div>
    );
};

export default DebtsPage;
