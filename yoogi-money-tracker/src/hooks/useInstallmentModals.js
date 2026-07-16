import { useState } from 'react';

export const useInstallmentModals = () => {
    // Add/Edit Modal
    const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [initialLender, setInitialLender] = useState('');

    // Details Modal
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [selectedLenderName, setSelectedLenderName] = useState(null);

    // Minimum Payment Modal
    const [isMinPaymentOpen, setIsMinPaymentOpen] = useState(false);
    const [selectedMinPaymentItem, setSelectedMinPaymentItem] = useState(null);

    // Edit Transaction Modal
    const [isLoanEditOpen, setIsLoanEditOpen] = useState(false);
    const [editingLoanTxn, setEditingLoanTxn] = useState(null);

    // Pay Installment Modal
    const [isPayInstallmentOpen, setIsPayInstallmentOpen] = useState(false);
    const [selectedItemsForPayment, setSelectedItemsForPayment] = useState([]);

    // Confirm Modal
    const [confirmModalState, setConfirmModalState] = useState({
        isOpen: false,
        type: null,
        data: null,
        title: '',
        description: '',
        confirmVariant: 'primary'
    });

    const openAddModal = (lenderName = '') => {
        setEditingItem(null);
        setInitialLender(lenderName);
        setIsAddEditModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setInitialLender('');
        setIsAddEditModalOpen(true);
    };

    const closeAddEditModal = () => {
        setIsAddEditModalOpen(false);
        setEditingItem(null);
        setInitialLender('');
    };

    const openConfirmModal = (options) => {
        setConfirmModalState({
            isOpen: true,
            ...options
        });
    };

    const closeConfirmModal = () => {
        setConfirmModalState(prev => ({ ...prev, isOpen: false }));
    };

    return {
        // Add/Edit
        isAddEditModalOpen, setIsAddEditModalOpen,
        editingItem, setEditingItem,
        initialLender, setInitialLender,
        openAddModal, openEditModal, closeAddEditModal,

        // Details
        isDetailsOpen, setIsDetailsOpen,
        selectedLenderName, setSelectedLenderName,

        // Min Payment
        isMinPaymentOpen, setIsMinPaymentOpen,
        selectedMinPaymentItem, setSelectedMinPaymentItem,

        // Loan Edit
        isLoanEditOpen, setIsLoanEditOpen,
        editingLoanTxn, setEditingLoanTxn,

        // Pay Installment
        isPayInstallmentOpen, setIsPayInstallmentOpen,
        selectedItemsForPayment, setSelectedItemsForPayment,

        // Confirm
        confirmModalState, setConfirmModalState,
        openConfirmModal, closeConfirmModal
    };
};
