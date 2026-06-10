
const URL = 'http://localhost:3000/api/designs';

async function verify() {
    try {
        console.log('\n--- Testing POST with Complex Data ---');
        const newDesign = {
            id: 'test_complex_save',
            name: 'API Complex Test',
            color: 'brown',
            views: {
                front: {
                    objects: [
                        {
                            type: 'image',
                            version: '5.3.0',
                            left: 100,
                            top: 100,
                            width: 50,
                            height: 50,
                            src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
                        }
                    ]
                },
                back: { objects: [] }
            },
            previewImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        };

        const res2 = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newDesign),
        });
        console.log(`POST Status: ${res2.status}`);
        const postBody = await res2.text();
        console.log('POST Body:', postBody);

    } catch (err) {
        console.error('Fetch failed:', err.message);
    }
}

verify();
