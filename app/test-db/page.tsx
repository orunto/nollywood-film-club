'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function TestDatabase() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const insertMovie = async () => {
    setLoading(true);
    setResult('');
    
    try {
      const response = await fetch('/api/insert-movie', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResult(`✅ Movie inserted successfully! ID: ${data.id}`);
      } else {
        setResult(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Database Test</h1>
      
      <Button 
        onClick={insertMovie} 
        disabled={loading}
        className="w-full mb-4"
      >
        {loading ? 'Inserting...' : 'Insert Movie of the Week'}
      </Button>
      
      {result && (
        <div className={`p-4 rounded-md ${
          result.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {result}
        </div>
      )}
    </div>
  );
}
