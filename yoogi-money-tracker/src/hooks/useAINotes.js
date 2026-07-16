import { useState } from 'react';
import {
    addAIMemory, updateAIMemory, deleteAIMemory,
    addAbbreviation, updateAbbreviation, deleteAbbreviation
} from '../utils/supabaseHelpers';

export const useAINotes = (user) => {
    // Memory Modal
    const [editModal, setEditModal] = useState({ isOpen: false, mode: 'add', data: null });
    const [formKeyword, setFormKeyword] = useState('');
    const [formCategoryId, setFormCategoryId] = useState('');
    const [formSubcategoryId, setFormSubcategoryId] = useState('');

    // Abbreviation Modal
    const [abbrModal, setAbbrModal] = useState({ isOpen: false, mode: 'add', data: null });
    const [formShortForm, setFormShortForm] = useState('');
    const [formLongForm, setFormLongForm] = useState('');

    // Delete
    const [confirmState, setConfirmState] = useState({ isOpen: false, type: 'memory', data: null });
    const [isDeleting, setIsDeleting] = useState(false);

    // --- Open/Close Modal ---
    const openAdd = () => {
        setEditModal({ isOpen: true, mode: 'add', data: null });
        setFormKeyword('');
        setFormCategoryId('');
        setFormSubcategoryId('');
    };

    const openEdit = (mem) => {
        setEditModal({ isOpen: true, mode: 'edit', data: mem });
        setFormKeyword(mem.keyword);
        setFormCategoryId(mem.categoryId);
        setFormSubcategoryId(mem.subcategoryId);
    };

    const closeModal = () => {
        setEditModal({ isOpen: false, mode: 'add', data: null });
    };

    // --- Abbreviation Open/Close Modal ---
    const openAddAbbr = () => {
        setAbbrModal({ isOpen: true, mode: 'add', data: null });
        setFormShortForm('');
        setFormLongForm('');
    };

    const openEditAbbr = (abbr) => {
        setAbbrModal({ isOpen: true, mode: 'edit', data: abbr });
        setFormShortForm(abbr.shortForm);
        setFormLongForm(abbr.longForm);
    };

    const closeAbbrModal = () => {
        setAbbrModal({ isOpen: false, mode: 'add', data: null });
    };

    const openConfirmDelete = (type, data) => {
        setConfirmState({ isOpen: true, type, data });
    };

    const closeConfirmDelete = () => {
        setConfirmState({ isOpen: false, type: 'memory', data: null });
    };

    // --- Save Memory ---
    const handleSave = async (e) => {
        e.preventDefault();
        if (!user || !formKeyword.trim() || !formCategoryId) return;

        try {
            if (editModal.mode === 'add') {
                await addAIMemory(user.uid, {
                    keyword: formKeyword.trim().toLowerCase(),
                    categoryId: formCategoryId,
                    subcategoryId: formSubcategoryId,
                    source: 'user',
                });
            } else {
                await updateAIMemory(user.uid, editModal.data.id, {
                    keyword: formKeyword.trim().toLowerCase(),
                    categoryId: formCategoryId,
                    subcategoryId: formSubcategoryId,
                });
            }
            closeModal();
        } catch (err) {
            console.error(err);
            alert('Lỗi lưu ghi chú!');
        }
    };

    // --- Save Abbreviation ---
    const handleSaveAbbr = async (e) => {
        e.preventDefault();
        if (!user || !formShortForm.trim() || !formLongForm.trim()) return;

        try {
            if (abbrModal.mode === 'add') {
                await addAbbreviation(user.uid, {
                    shortForm: formShortForm.trim().toLowerCase(),
                    longForm: formLongForm.trim(),
                });
            } else {
                await updateAbbreviation(user.uid, abbrModal.data.id, {
                    shortForm: formShortForm.trim().toLowerCase(),
                    longForm: formLongForm.trim(),
                });
            }
            closeAbbrModal();
        } catch (err) {
            console.error(err);
            alert('Lỗi lưu viết tắt!');
        }
    };

    // --- Execute Delete ---
    const executeDelete = async () => {
        if (!user || !confirmState.data) return;
        setIsDeleting(true);
        try {
            if (confirmState.type === 'memory') {
                await deleteAIMemory(user.uid, confirmState.data.id);
            } else if (confirmState.type === 'abbreviation') {
                await deleteAbbreviation(user.uid, confirmState.data.id);
            }
            setConfirmState({ isOpen: false, type: 'memory', data: null });
        } catch (err) {
            console.error(err);
            alert('Lỗi khi xóa!');
        } finally {
            setIsDeleting(false);
        }
    };

    return {
        editModal, formKeyword, setFormKeyword, formCategoryId, setFormCategoryId, formSubcategoryId, setFormSubcategoryId,
        abbrModal, formShortForm, setFormShortForm, formLongForm, setFormLongForm,
        confirmState, isDeleting,
        openAdd, openEdit, closeModal,
        openAddAbbr, openEditAbbr, closeAbbrModal,
        openConfirmDelete, closeConfirmDelete,
        handleSave, handleSaveAbbr, executeDelete
    };
};
