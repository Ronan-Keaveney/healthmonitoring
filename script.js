function navigate(page) {
    const contentDiv = document.getElementById('content');
    if (page === 'home') {
        contentDiv.innerHTML = '<h1>Welcome to the Health Monitoring System</h1>';
    } else if (page === 'patients') {
        contentDiv.innerHTML = '<h1>Patients List</h1><p>Here is where you would display patient information.</p>';
        fetchPatients(false);
    } else if (page === 'alerts') {
        contentDiv.innerHTML = '<h1>Alerts</h1><p>Here is where you would manage alerts for patients.</p>';
        fetchPatients(true);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Check if the addPatientForm is present before adding event listeners
    const form = document.getElementById('addPatientForm');
    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();
            const patientData = {
                name: document.getElementById('patientName').value,
                age: parseInt(document.getElementById('patientAge').value, 10),
                condition: document.getElementById('patientCondition').value,
                emergencyContact: document.getElementById('emergencyContact').value,
            };
            addPatientData(patientData);
        });
    }

    // Optionally, call fetchPatients if you are certain this script runs on the Patients page
    if (document.getElementById('patients')) {
        fetchPatients();
    }
});

// Function to add patient data
function addPatientData(patientData) {
    fetch('https://61l4ofp37c.execute-api.eu-west-1.amazonaws.com/stage1/patients', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(patientData),
})
.then(response => response.json())
.then(data => {
    console.log('Patient data added:', data);
    clearForm();
})
.catch(error => console.error('Error adding patient data:', error));
}

function clearForm() {
    // Clear the form fields
    document.getElementById('patientName').value = '';
    document.getElementById('patientAge').value = '';
    document.getElementById('patientCondition').value = '';
}

document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('patients')) {
        fetchPatients();
    }
});

function fetchPatients() {
    const apiUrl = 'https://61l4ofp37c.execute-api.eu-west-1.amazonaws.com/stage1/patients';
    fetch(apiUrl, { method: 'GET', headers: {'Content-Type': 'application/json'} })
    .then(response => {
        if (!response.ok) throw new Error('Failed to fetch');
        return response.json();
    })
    .then(patients => {
        displayPatients(patients);
        displayPatientsByStatus(patients); // This would be a new function to handle the status-based display
    })
    .catch(error => {
        console.error('Error fetching patients:', error);
        alert('Failed to load patient data.');
    });
}

document.getElementById('deceasedButton').addEventListener('click', function() {
    fetch('https://61l4ofp37c.execute-api.eu-west-1.amazonaws.com/stage1/patients/deceased', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      console.log('Archiving successful:', data);
      fetchPatients();
    })
    .catch(error => {
      console.error('Error during archiving:', error);
    });
  });

function displayPatientsByStatus(patients) {
    const statusContainers = {
        'Expected': document.getElementById('expectedPatients'),
        'Arrived': document.getElementById('arrivedPatients'),
        'In Consultation': document.getElementById('consultationPatients')
    };

    // Clear existing entries in status management sections
    Object.values(statusContainers).forEach(container => container.innerHTML = '');

    patients.forEach(patient => {
        const statusListItem = document.createElement('li');
        statusListItem.className = 'patient-item';
        const patientName = document.createElement('span');
        patientName.textContent = `${patient.name}`;
        patientName.className = 'clickable-name';
        patientName.onclick = () => updatePatientStatus(patient);
        statusListItem.appendChild(patientName);
        
        if (statusContainers[patient.status]) {
            statusContainers[patient.status].appendChild(statusListItem);
        } else {
            console.error(`Unhandled patient status: ${patient.status}`);
        }
    });
}

function displayPatients(patients) {
    const patientsList = document.getElementById('patients');
    const expectedList = document.getElementById('expectedPatients');
    const arrivedList = document.getElementById('arrivedPatients');
    const consultationList = document.getElementById('consultationPatients');

    // Clear existing entries in the general list and the state management sections
    patientsList.innerHTML = '';
    expectedList.innerHTML = '';
    arrivedList.innerHTML = '';
    consultationList.innerHTML = '';

    patients.forEach(patient => {
        // General list item setup
        const generalListItem = document.createElement('li');
        generalListItem.className = 'patient-item';
        generalListItem.textContent = `Name: ${patient.name}, Age: ${patient.age}, Condition: ${patient.condition}, Emergency Contact: ${patient.emergencyContact}`;

        // Delete button for each patient in the general list
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.onclick = () => deletePatient(patient.patientId);
        generalListItem.appendChild(deleteButton);

        // Append to the general patient list
        patientsList.appendChild(generalListItem);

        // Status-based display setup
        const statusListItem = document.createElement('li');
        statusListItem.className = 'patient-item';

        // Clickable patient name for status movement
        const patientName = document.createElement('span');
        patientName.textContent = `${patient.name}`;
        patientName.className = 'clickable-name';
        patientName.onclick = () => updatePatientStatus(patient);
        statusListItem.appendChild(patientName);

        // Determine the correct list based on the patient's status
        switch(patient.status) {
            case 'Expected':
                expectedList.appendChild(statusListItem);
                break;
            case 'Arrived':
                arrivedList.appendChild(statusListItem);
                break;
            case 'In Consultation':
                consultationList.appendChild(statusListItem);
                break;
            default:
                console.error(`Unhandled patient status: ${patient.status}`);
                break;
        }
    });
}




function updatePatientStatus(patient) {
    const nextStatus = {
        'Expected': 'Arrived',
        'Arrived': 'In Consultation',
        'In Consultation': 'Expected'
    };

    const newStatus = nextStatus[patient.status] || 'Expected';

    fetch(`https://61l4ofp37c.execute-api.eu-west-1.amazonaws.com/stage1/patients/${patient.patientId}/status`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ status: newStatus })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Status update successful:', data);
        if(newStatus === 'In Consultation') {
            addToSQSQueue(patient.patientId);
        }
        fetchPatients(); // Refresh the list to reflect changes
    })
    .catch(error => console.error('Error updating patient status:', error));
}
    // Perform the PUT request to update the status
    fetch(`https://61l4ofp37c.execute-api.eu-west-1.amazonaws.com/stage1/patients/${patient.patientId}/status`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ status: newStatus })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Status update successful:', data);
        fetchPatients(); // Refresh the list to reflect changes
    })
    .catch(error => console.error('Error updating patient status:', error));




function movePatient(patient) {
    const nextStatus = {'Expected': 'Arrived', 'Arrived': 'In Consultation', 'In Consultation': 'Expected'};
    patient.status = nextStatus[patient.status];
    if (patient.status === 'Expected') {
        addToSQSQueue(patient.patientId);
    }
    updatePatientStatus(patient);
}

function addToSQSQueue(patientId) {
    fetch('https://61l4ofp37c.execute-api.eu-west-1.amazonaws.com/stage1/queue', { // Replace with your API Gateway endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patientId })
    })
    .then(response => response.json())
    .then(data => console.log('Added to queue:', data))
    .catch(error => console.error('Error adding to queue:', error));
}



function deletePatient(patientId) {
    const apiUrl = `https://61l4ofp37c.execute-api.eu-west-1.amazonaws.com/stage1/patients/${patientId}`;
    fetch(apiUrl, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) { throw new Error('Network response was not ok'); }
        console.log('Patient deleted successfully');
        fetchPatients(); // Refresh the list after deletion
    })
    .catch(error => {
        console.error('Error deleting patient:', error);
        alert('Failed to delete patient data.');
    });
}

  function sendAlert(patientId, emergencyContact) {
    fetch('https://9mjfnmksff.execute-api.eu-west-1.amazonaws.com/prod/alerts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            patientId: patientId,
            emergencyContact: emergencyContact
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log('Alert sent successfully:', data);
    })
    .catch(error => {
        console.error('Error during sending alert:', error);
    });
}
