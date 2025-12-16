// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";

// export default function Home() {
//   const [name, setName] = useState("");
//   const [password, setPassword] = useState("");
  
//   const router = useRouter();
 
//   const login = async () => {
//     const res = await fetch("/api/auth", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ name, password }),
//     });

//     const data = await res.json();

//     if (!res.ok) {
//       alert(data.error);
//       return;
//     }

//     localStorage.setItem("user", JSON.stringify(data.user));
//     router.push("/chat");
//   };

//   return (
//     <div className="h-screen flex items-center justify-center bg-green-50">
//       <div className="bg-white p-6 rounded w-80 shadow">
//         <h1 className="text-xl font-bold text-center mb-4">
//           WhatsApp Clone
//         </h1>

//         <input
//           placeholder="Unique Name"
//           className="w-full border p-2 mb-3"
//           onChange={(e) => setName(e.target.value)}
//         />

//         <input
//           type="password"
//           placeholder="Password"
//           className="w-full border p-2 mb-4"
//           onChange={(e) => setPassword(e.target.value)}
//         />

//         <button
//           onClick={login}
//           className="w-full bg-green-600 text-white py-2 rounded"
//         >
//           Login
//         </button>
//       </div>
//     </div>
//   );
// }
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); // ✅ ADDED
  const router = useRouter();

  const login = async () => {
    if (!name || !password) return;

    setLoading(true); // ✅ START SPINNER

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error);
        setLoading(false); // ✅ STOP SPINNER
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/chat");
    } catch {
      alert("Login failed");
      setLoading(false); // ✅ STOP SPINNER
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-green-50">
      <div className="bg-white p-6 rounded w-80 shadow">
        <h1 className="text-xl font-bold text-center mb-4">
          WhatsApp Clone
        </h1>

        <input
          placeholder="Unique Name"
          className="w-full border p-2 mb-3"
          onChange={(e) => setName(e.target.value)}
          disabled={loading} // ✅ optional UX
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border p-2 mb-4"
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading} // ✅ optional UX
        />

        <button
          onClick={login}
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded flex items-center justify-center"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Logging in...
            </span>
          ) : (
            "Login"
          )}
        </button>
      </div>
    </div>
  );
}
