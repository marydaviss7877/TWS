import React, { useCallback } from 'react';
import EntityManagerPage from '../../../../components/common/EntityManagerPage';
import { retailApi } from '../../../../../../shared/services/industry';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';

const productFields = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'sku', label: 'SKU', type: 'text', required: true },
  { name: 'category', label: 'Category', type: 'text', required: true },
  { name: 'price', label: 'Price', type: 'number', min: 0, step: 0.01, required: true },
  { name: 'stock', label: 'Stock', type: 'number', min: 0, step: 1, required: true },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'discontinued', label: 'Discontinued' }
    ],
    defaultValue: 'active'
  },
  {
    name: 'description',
    label: 'Description',
    type: 'textarea',
    fullWidth: true,
    rows: 3
  }
];

const productColumns = [
  {
    key: 'name',
    header: 'Name'
  },
  {
    key: 'sku',
    header: 'SKU'
  },
  {
    key: 'category',
    header: 'Category'
  },
  {
    key: 'price',
    header: 'Price',
    render: (product) => `$${product.price?.toFixed(2) ?? '0.00'}`,
    align: 'right'
  },
  {
    key: 'stock',
    header: 'Stock',
    render: (product) => product.stock ?? 0,
    align: 'right'
  },
  {
    key: 'status',
    header: 'Status',
    render: (product) => (
      <span
        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          product.status === 'active'
            ? 'bg-green-100 text-green-800'
            : product.status === 'discontinued'
            ? 'bg-red-100 text-red-800'
            : 'bg-gray-100 text-gray-800'
        }`}
      >
        {product.status}
      </span>
    )
  }
];

const searchKeys = [
  'name',
  'sku',
  'category',
  (item) => item.description ?? ''
];

const Products = () => {
  const tenantSlug = useTenantSlug();

  const fetchProducts = useCallback(async () => {
    const response = await retailApi.getProducts(tenantSlug);
    return response.data?.data || [];
  }, [tenantSlug]);

  const createProduct = useCallback(
    (payload) => retailApi.createProduct(tenantSlug, payload),
    [tenantSlug]
  );

  const updateProduct = useCallback(
    (id, payload) => retailApi.updateProduct(tenantSlug, id, payload),
    [tenantSlug]
  );

  const mapEntityToForm = useCallback((product) => ({
    name: product.name ?? '',
    sku: product.sku ?? '',
    category: product.category ?? '',
    price: product.price ?? '',
    stock: product.stock ?? '',
    status: product.status ?? 'active',
    description: product.description ?? ''
  }), []);

  const mapFormToPayload = useCallback((values) => ({
    name: values.name,
    sku: values.sku,
    category: values.category,
    price: Number(values.price || 0),
    stock: Number(values.stock || 0),
    status: values.status || 'active',
    description: values.description
  }), []);

  return (
    <EntityManagerPage
      title="Products"
      description="Manage your retail products"
      fields={productFields}
      columns={productColumns}
      fetchEntities={fetchProducts}
      createEntity={createProduct}
      updateEntity={updateProduct}
      mapEntityToForm={mapEntityToForm}
      mapFormToPayload={mapFormToPayload}
      searchKeys={searchKeys}
      searchPlaceholder="Search by name, SKU or category"
      emptyStateMessage="No products found. Create your first product to get started."
      tenantSlug={tenantSlug}
    />
  );
};

export default Products;

