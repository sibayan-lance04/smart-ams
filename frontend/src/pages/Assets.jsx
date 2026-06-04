import { useEffect, useState, useMemo } from 'react';
import api from '../api';

const empty = { asset_name:'',description:'',control_number:'',purchase_date:'',cost:'',lifetime_years:'',depreciation_method:'straight-line',status:'Active',assigned_to_name:'',assigned_to_email:'',assigned_to_contact:'',department_id:'',asset_location:'',insurance_type:'',insurance_provider:'',insurance_start:'',insurance_end:'',insurance_details:'' };
const fmtCur = n => n ? `₱${parseFloat(n).toLocaleString('en-PH',{minimumFractionDigits:2})}` : '₱0.00';
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'2-digit'}) : '';
const statusColor = s => ({Active:'badge-success',Depreciated:'badge-warning','Under Maintenance':'badge-dark',Disposed:'badge-danger'}[s]||'badge-secondary');

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [modal, setModal] = useState(null); // null | 'create' | 'edit' | 'view'
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [alert, setAlert] = useState(null);
  const [search, setSearch] = useState('');
  const [errors, setErrors] = useState({});
  const [viewAsset, setViewAsset] = useState(null);

  const load = () => {
    api.get('/assets').then(r => setAssets(r.data.data));
    api.get('/departments').then(r => setDepartments(r.data.data));
  };
  useEffect(() => { load(); }, []);

  const showAlert = (msg, type='success') => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 4000);
  };

  const openCreate = () => {
    setForm({ ...empty, purchase_date: new Date().toISOString().split('T')[0] });
    setErrors({}); setEditId(null); setModal('create');
  };
  const openEdit = a => {
    setForm({
      asset_name: a.asset_name||'', description: a.description||'', control_number: a.control_number||'',
      purchase_date: a.purchase_date?.split('T')[0]||'', cost: a.cost||'', lifetime_years: a.lifetime_years||'',
      depreciation_method: a.depreciation_method||'straight-line', status: a.status||'Active',
      assigned_to_name: a.assigned_to_name||'', assigned_to_email: a.assigned_to_email||'',
      assigned_to_contact: a.assigned_to_contact||'', department_id: a.department_id||'',
      asset_location: a.asset_location||'', insurance_type: a.insurance_type||'',
      insurance_provider: a.insurance_provider||'', insurance_start: a.insurance_start?.split('T')[0]||'',
      insurance_end: a.insurance_end?.split('T')[0]||'', insurance_details: a.insurance_details||'',
    });
    setErrors({}); setEditId(a.asset_id); setModal('edit');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      if (editId) await api.put(`/assets/${editId}`, form);
      else await api.post('/assets', form);
      setModal(null); load();
      showAlert(editId ? 'Asset updated.' : 'Asset created.');
    } catch (err) {
      showAlert(err.response?.data?.message || 'Error saving asset.', 'danger');
    }
  };

  const handleDelete = async a => {
    if (a.status !== 'Disposed') { showAlert('Only Disposed assets can be deleted.', 'danger'); return; }
    if (!confirm(`Delete "${a.asset_name}"?`)) return;
    try {
      await api.delete(`/assets/${a.asset_id}`);
      load(); showAlert('Asset deleted.');
    } catch (err) {
      showAlert(err.response?.data?.message || 'Delete failed.', 'danger');
    }
  };

  const filtered = useMemo(() => {
    if (!search) return assets;
    const q = search.toLowerCase();
    return assets.filter(a =>
      a.asset_name?.toLowerCase().includes(q) ||
      a.control_number?.toLowerCase().includes(q) ||
      a.status?.toLowerCase().includes(q) ||
      a.department_name?.toLowerCase().includes(q) ||
      a.assigned_to_name?.toLowerCase().includes(q)
    );
  }, [assets, search]);

  const F = ({ label, name, type='text', required, options, span }) => (
    <div className="form-group" style={span ? { gridColumn: `span ${span}` } : {}}>
      <label className="form-label">{label}{required && <span style={{color:'red'}}> *</span>}</label>
      {options ? (
        <select className="form-control" value={form[name]} onChange={e => setForm(p=>({...p,[name]:e.target.value}))}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type={type} className="form-control" value={form[name]}
          onChange={e => setForm(p=>({...p,[name]:e.target.value}))} />
      )}
    </div>
  );

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title"><i className="fas fa-boxes" style={{marginRight:10}}/>Assets</h1>
        <button className="btn btn-primary" onClick={openCreate}><i className="fas fa-plus"/>Add New Asset</button>
      </div>

      {alert && <div className={`alert alert-${alert.type}`}><i className={`fas fa-${alert.type==='success'?'check-circle':'exclamation-triangle'}`}/>{alert.msg}</div>}

      <div className="card">
        <div className="card-header">
          <h5><i className="fas fa-list" style={{marginRight:8}}/>Assets List <span style={{opacity:0.7,fontWeight:400}}>({filtered.length})</span></h5>
          <input className="form-control table-search" placeholder="Search assets..." value={search} onChange={e=>setSearch(e.target.value)} style={{maxWidth:260}}/>
        </div>
        <div className="card-body" style={{padding:0}}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Asset Name</th><th>Control #</th><th>Location</th><th>Purchase Date</th>
                  <th>Cost</th><th>Current Value</th><th>Status</th><th>Assigned To</th>
                  <th>Department</th><th>Warranty</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={11} className="empty-state">No assets found.</td></tr>}
                {filtered.map(a => {
                  const expired = a.insurance_end && new Date(a.insurance_end) < new Date();
                  return (
                    <tr key={a.asset_id}>
                      <td><strong>{a.asset_name}</strong></td>
                      <td>{a.control_number}</td>
                      <td>{a.asset_location || '—'}</td>
                      <td>{fmtDate(a.purchase_date)}</td>
                      <td>{fmtCur(a.cost)}</td>
                      <td style={{color:'var(--success)',fontWeight:600}}>{fmtCur(a.current_value || a.cost)}</td>
                      <td><span className={`badge ${statusColor(a.status)}`}>{a.status}</span></td>
                      <td>{a.assigned_to_name || <span className="text-muted">Unassigned</span>}</td>
                      <td>{a.department_name || '—'}</td>
                      <td>
                        {a.insurance_end
                          ? <span className={`badge ${expired ? 'badge-danger':'badge-success'}`}>{expired?'Expired':'Active'}</span>
                          : <span className="badge badge-secondary">None</span>}
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button className="btn btn-sm btn-info btn-icon" onClick={()=>{setViewAsset(a);setModal('view');}} title="View"><i className="fas fa-eye"/></button>
                          <button className="btn btn-sm btn-outline btn-icon" onClick={()=>openEdit(a)} title="Edit"><i className="fas fa-edit"/></button>
                          <button className="btn btn-sm btn-danger btn-icon" onClick={()=>handleDelete(a)} title="Delete"><i className="fas fa-trash"/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* View Modal */}
      {modal === 'view' && viewAsset && (
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h5><i className="fas fa-info-circle" style={{marginRight:8}}/>Asset Details</h5>
              <button className="modal-close" onClick={()=>setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
                {[['Asset ID',viewAsset.asset_id],['Name',viewAsset.asset_name],['Control #',viewAsset.control_number],
                  ['Location',viewAsset.asset_location],['Purchase Date',fmtDate(viewAsset.purchase_date)],['Status',viewAsset.status],
                  ['Original Cost',fmtCur(viewAsset.cost)],['Current Value',fmtCur(viewAsset.current_value||viewAsset.cost)],
                  ['Dept.',viewAsset.department_name||'—'],['Assigned To',viewAsset.assigned_to_name||'Unassigned'],
                  ['Email',viewAsset.assigned_to_email||'—'],['Contact',viewAsset.assigned_to_contact||'—'],
                  ['Insurance',viewAsset.insurance_type||'—'],['Provider',viewAsset.insurance_provider||'—'],
                  ['Ins. End',fmtDate(viewAsset.insurance_end)],
                ].map(([k,v]) => (
                  <div key={k}>
                    <div style={{fontSize:'0.78rem',color:'#888',fontWeight:600,textTransform:'uppercase'}}>{k}</div>
                    <div style={{fontWeight:500,marginTop:2}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setModal(null)}>Close</button>
              <button className="btn btn-primary" onClick={()=>{openEdit(viewAsset);}}>Edit Asset</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h5><i className={`fas fa-${modal==='create'?'plus':'edit'}`} style={{marginRight:8}}/>{modal==='create'?'Add New Asset':'Edit Asset'}</h5>
              <button className="modal-close" onClick={()=>setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Basic */}
                <div className="group-card group-basic">
                  <div className="group-title"><i className="fas fa-info-circle" style={{marginRight:8}}/>Basic Information</div>
                  <div className="form-row form-row-2">
                    <F label="Asset Name" name="asset_name" required />
                    <F label="Control Number" name="control_number" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea className="form-control" rows={2} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}/>
                  </div>
                  <F label="Asset Location" name="asset_location" required />
                </div>

                {/* Financial */}
                <div className="group-card group-financial">
                  <div className="group-title"><i className="fas fa-dollar-sign" style={{marginRight:8}}/>Financial Information</div>
                  <div className="form-row form-row-3">
                    <F label="Purchase Date" name="purchase_date" type="date" required />
                    <F label="Cost (₱)" name="cost" type="number" required />
                    <F label="Lifetime (Years)" name="lifetime_years" type="number" required />
                  </div>
                  <div className="form-row form-row-2">
                    <F label="Depreciation Method" name="depreciation_method" options={[{value:'straight-line',label:'Straight Line'},{value:'declining-balance',label:'Declining Balance'}]} />
                    <F label="Status" name="status" options={['Active','Depreciated','Disposed','Under Maintenance'].map(s=>({value:s,label:s}))} />
                  </div>
                </div>

                {/* Assignment */}
                <div className="group-card group-assignment">
                  <div className="group-title"><i className="fas fa-user" style={{marginRight:8}}/>Assignment <small style={{fontWeight:400,color:'#888'}}>(All required if any filled)</small></div>
                  <div className="form-row form-row-2">
                    <F label="Assigned To" name="assigned_to_name" />
                    <F label="Department" name="department_id" options={[{value:'',label:'Select Department'},...departments.map(d=>({value:d.department_id,label:d.department_name}))]} />
                    <F label="Email" name="assigned_to_email" type="email" />
                    <F label="Contact" name="assigned_to_contact" />
                  </div>
                </div>

                {/* Insurance */}
                <div className="group-card group-insurance">
                  <div className="group-title"><i className="fas fa-shield-alt" style={{marginRight:8}}/>Insurance <small style={{fontWeight:400,color:'#888'}}>(All required if any filled)</small></div>
                  <div className="form-row form-row-2">
                    <F label="Insurance Type" name="insurance_type" />
                    <F label="Provider" name="insurance_provider" />
                    <F label="Start Date" name="insurance_start" type="date" />
                    <F label="End Date" name="insurance_end" type="date" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Insurance Details</label>
                    <textarea className="form-control" rows={2} value={form.insurance_details} onChange={e=>setForm(p=>({...p,insurance_details:e.target.value}))}/>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><i className="fas fa-save"/>Save Asset</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
