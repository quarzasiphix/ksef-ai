import React from 'react';

export default function TokenTest() {
  console.log('TokenTest component loaded!');
  console.log('Current URL:', window.location.href);
  console.log('Pathname:', window.location.pathname);
  console.log('Search:', window.location.search);

  // Try to render immediately
  try {
    return (
      <div style={{ padding: '20px', backgroundColor: 'red', color: 'white' }}>
        <h1>Token Test Component</h1>
        <p>If you see this, the route is working!</p>
        <p>URL: {window.location.href}</p>
        <p>Pathname: {window.location.pathname}</p>
        <p>Search: {window.location.search}</p>
      </div>
    );
  } catch (error) {
    console.error('Error rendering TokenTest:', error);
    return <div style={{background: 'orange', color: 'black'}}>Error rendering TokenTest: {error.message}</div>;
  }
}
