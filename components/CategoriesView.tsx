"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

type Category = {
  id: string;
  name: string;
};

export default function CategoriesView() {
  const { userId, accessToken } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setCategories([]);
      return;
    }
    fetch(`/api/categories?userId=${encodeURIComponent(userId)}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
      .then((res) => {
        if (!res.ok) {
          return res.text().then((msg) => {
            throw new Error(msg || "Erreur categories");
          });
        }
        return res.json();
      })
      .then((data) => setCategories(data.categories ?? []))
      .catch((err) => setError(err.message));
  }, [userId, accessToken]);

  const handleCreate = async () => {
    if (!userId || !name.trim()) return;
    setError(null);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ userId, name: name.trim() }),
    });
    if (!res.ok) {
      const msg = await res.text();
      setError(msg);
      return;
    }
    const data = await res.json();
    setCategories((prev) => [data.category, ...prev]);
    setName("");
  };

  const handleDelete = async (categoryId: string) => {
    if (!userId) return;
    setError(null);
    const res = await fetch(
      `/api/categories?userId=${encodeURIComponent(
        userId
      )}&categoryId=${encodeURIComponent(categoryId)}`,
      {
        method: "DELETE",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      }
    );
    if (!res.ok) {
      const msg = await res.text();
      setError(msg);
      return;
    }
    setCategories((prev) => prev.filter((cat) => cat.id !== categoryId));
  };

  return (
    <div className="card">
      {!userId ? (
        <div className="meta">Connectez-vous pour gérer les catégories.</div>
      ) : null}
      <div className="grid">
        <div>
          <label>Nouvelle catégorie</label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div>
          <button type="button" onClick={handleCreate}>
            Ajouter
          </button>
        </div>
      </div>
      {error ? <div className="meta">Erreur: {error}</div> : null}
      <div className="table">
        <div className="row header">
          <div>Nom</div>
          <div>ID</div>
          <div>Action</div>
        </div>
        {categories.map((category) => (
          <div key={category.id} className="row">
            <div>{category.name}</div>
            <div>{category.id}</div>
            <div>
              <button
                type="button"
                onClick={() => handleDelete(category.id)}
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
