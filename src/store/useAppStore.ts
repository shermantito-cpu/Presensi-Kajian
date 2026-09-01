import { useState, useEffect } from 'react';
import { AttendanceRecord } from '../types';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useAttendanceStore() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    const q = collection(db, 'attendanceRecords');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newRecords: AttendanceRecord[] = [];
      snapshot.forEach((doc) => {
        newRecords.push({ id: doc.id, ...doc.data() } as AttendanceRecord);
      });
      // Sort by timestamp descending
      newRecords.sort((a, b) => b.timestamp - a.timestamp);
      setRecords(newRecords);
    });
    return () => unsubscribe();
  }, []);

  const addRecord = async (record: Omit<AttendanceRecord, 'id' | 'timestamp'>) => {
    // Check if already attended on this date and schedule (client-side check for rapid clicks)
    const exists = records.some(
      (r) => r.civitasId === record.civitasId && r.date === record.date && r.scheduleId === record.scheduleId && r.status !== 'pending'
    );
    
    if (exists && record.status !== 'pending') return;
    
    try {
      const newRecord = {
        ...record,
        status: record.status || 'approved',
        timestamp: Date.now(),
      };
      await addDoc(collection(db, 'attendanceRecords'), newRecord);
    } catch (error) {
      console.error("Error adding document: ", error);
    }
  };
  
  const removeRecord = async (civitasId: string, date: string, scheduleId: string) => {
    try {
      const q = query(
        collection(db, 'attendanceRecords'),
        where('civitasId', '==', civitasId),
        where('date', '==', date),
        where('scheduleId', '==', scheduleId)
      );
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(async (document) => {
        await deleteDoc(doc(db, 'attendanceRecords', document.id));
      });
    } catch (error) {
      console.error("Error removing document: ", error);
    }
  }

  const removeRecordById = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'attendanceRecords', id));
    } catch (error) {
      console.error("Error removing document by ID: ", error);
    }
  }

  const updateRecordStatus = async (id: string, newStatus: 'approved' | 'pending') => {
    try {
      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'attendanceRecords', id), {
        status: newStatus
      });
    } catch (error) {
      console.error("Error updating document status: ", error);
    }
  }

  return { records, addRecord, removeRecord, removeRecordById, updateRecordStatus };
}

export function useAuth() {
  const [role, setRole] = useState<'admin' | 'user' | null>(() => {
    const stored = localStorage.getItem('authRole');
    if (stored === 'admin' || stored === 'user') {
      return stored as 'admin' | 'user';
    }
    return null;
  });

  const login = (newRole: 'admin' | 'user') => {
    setRole(newRole);
    localStorage.setItem('authRole', newRole);
  };

  const logout = () => {
    setRole(null);
    localStorage.removeItem('authRole');
  };

  return { role, login, logout };
}

export function useSettingsStore() {
  const [isKajianOpen, setIsKajianOpen] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'kajianStatus'), (docSnap) => {
      if (docSnap.exists()) {
        setIsKajianOpen(docSnap.data().isOpen);
      } else {
        // Initialize if not exists
        import('firebase/firestore').then(({ setDoc }) => {
          setDoc(doc(db, 'settings', 'kajianStatus'), { isOpen: true });
        }).catch(console.error);
      }
    });
    return () => unsubscribe();
  }, []);

  const setKajianStatus = async (isOpen: boolean) => {
    try {
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'settings', 'kajianStatus'), { isOpen }, { merge: true });
    } catch (error) {
      console.error("Error updating settings", error);
    }
  };

  return { isKajianOpen, setKajianStatus };
}
