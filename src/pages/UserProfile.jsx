import React from 'react';

const UserProfile = () => {
  // Dados de exemplo do usuário. Em um aplicativo real, você buscaria esses dados.
  const user = {
    name: 'Marcelo Feuser',
    email: 'marcelo@example.com',
    memberSince: '2023-01-15',
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4">Perfil do Usuário</h1>
      <div className="bg-white shadow-md rounded-lg p-6">
        <p className="mb-2"><strong className="font-semibold">Nome:</strong> {user.name}</p>
        <p className="mb-2"><strong className="font-semibold">Email:</strong> {user.email}</p>
        <p><strong className="font-semibold">Membro desde:</strong> {new Date(user.memberSince).toLocaleDateString()}</p>
      </div>
    </div>
  );
};

export default UserProfile;