import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import ClassInfo from '../components/ClassInfo';

export default function ClassInfoPage() {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !currentUser) navigate('/');
  }, [currentUser, loading, navigate]);

  if (!currentUser) return null;

  return (
    <div className="profile-page">
      <ClassInfo />
    </div>
  );
}
