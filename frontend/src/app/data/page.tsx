"use client";

import React, { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import ApplicationChart from "../../components/ApplicationChart";
import FilterComponent from "../../components/FilterComponent";

interface DataModel {
  id: number;
  ct_type: number;
  disk_size: number;
  core_count: number;
  ram_size: number;
  os_type: string;
  os_version: string;
  disableip6: string;
  nsapp: string;
  created_at: string;
  method: string;
  pve_version: string;
  status: string;
  error: string;
  type: string;
}

const DataFetcher: React.FC = () => {
  const [data, setData] = useState<DataModel[]>([]);
  const [filteredData, setFilteredData] = useState<DataModel[]>([]);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [installingCounts, setInstallingCounts] = useState(0);
  const [failedCounts, setFailedCounts] = useState(0);
  const [doneCounts, setDoneCounts] = useState(0);
  const [unknownCounts, setUnknownCounts] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const handleLoadMore = () => {
    setItemsPerPage((prev) => prev + 25);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  const toggleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const renderSortIcon = (column: string) => {
    if (sortColumn !== column) return <span className="text-gray-400">▲▼</span>;
    return sortDirection === "asc" ? (
      <span className="text-red-500">▲</span>
    ) : (
      <span className="text-red-500">▼</span>
    );
  };
  const sortData = (data: DataModel[]) => {
    if (!sortColumn) return data;

    return [...data].sort((a, b) => {
      const valA = a[sortColumn as keyof DataModel];
      const valB = b[sortColumn as keyof DataModel];

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }
      if (typeof valA === "string" && typeof valB === "string") {
        return sortDirection === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return 0;
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("https://api.htl-braunau.at/data/json");
        if (!response.ok) throw new Error(`Failed to fetch data: ${response.statusText}`);
        const result: DataModel[] = await response.json();
        setData(result);
        setFilteredData(result);

        // Status Counts
        let installing = 0,
          failed = 0,
          done = 0,
          unknown = 0;

        result.forEach((item) => {
          if (item.status === "installing") installing++;
          else if (item.status === "failed") failed++;
          else if (item.status === "done") done++;
          else unknown++;
        });

        setInstallingCounts(installing);
        setFailedCounts(failed);
        setDoneCounts(done);
        setUnknownCounts(unknown);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
        setItemsPerPage((prev) => (prev < filteredData.length ? prev + 25 : prev));
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [filteredData]);

  const applyFilters = async (column: string, operator: string, value: any) => {
    setFilters((prev) => {
      const updatedFilters = { ...prev };
      if (!updatedFilters[column]) updatedFilters[column] = [];

      const alreadyExists = updatedFilters[column].some((filter: { operator: string; value: any }) =>
        filter.operator === operator && filter.value === value
      );

      if (!alreadyExists) {
        updatedFilters[column].push({ operator, value });
      }

      return updatedFilters;
    });
  };

  const removeFilter = (column: string, index: number) => {
    setFilters((prev) => {
      const updatedFilters = { ...prev };
      updatedFilters[column] = updatedFilters[column].filter((_, i) => i !== index);
      if (updatedFilters[column].length === 0) delete updatedFilters[column];
      return updatedFilters;
    });
  };

  useEffect(() => {
    let sortedAndFilteredData = [...data];

    // Filtering
    sortedAndFilteredData = sortedAndFilteredData.filter((item) => {
      const matchesSearchQuery = Object.values(item).some((value) =>
        value.toString().toLowerCase().includes(searchQuery.toLowerCase())
      );
      const itemDate = new Date(item.created_at);
      const matchesDateRange = (!startDate || itemDate >= startDate) && (!endDate || itemDate <= endDate);
      return matchesSearchQuery && matchesDateRange;
    });

    Object.keys(filters).forEach((key) => {
      if (!filters[key] || filters[key].length === 0) return;

      sortedAndFilteredData = sortedAndFilteredData.filter((item) => {
        const itemValue = item[key as keyof DataModel];

        return filters[key].some(({ operator, value }: { operator: string; value: any }) => {
          if (typeof itemValue === "number") {
            value = parseFloat(value);
            if (operator === "greater") return itemValue > value;
            if (operator === "greater or equal") return itemValue >= value;
            if (operator === "less") return itemValue < value;
            if (operator === "less or equal") return itemValue <= value;
          }

          if (typeof itemValue === "string") {
            if (operator === "equals") return itemValue.toLowerCase() === value.toLowerCase();
            if (operator === "not equals") return itemValue.toLowerCase() !== value.toLowerCase();
            if (operator === "contains") return itemValue.toLowerCase().includes(value.toLowerCase());
            if (operator === "does not contain") return !itemValue.toLowerCase().includes(value.toLowerCase());
          }

          return false;
        });
      });
    });

    // Sortieren
    if (sortColumn) {
      sortedAndFilteredData.sort((a, b) => {
        const valA = a[sortColumn as keyof DataModel];
        const valB = b[sortColumn as keyof DataModel];

        if (typeof valA === "number" && typeof valB === "number") {
          return sortDirection === "asc" ? valA - valB : valB - valA;
        }
        if (typeof valA === "string" && typeof valB === "string") {
          return sortDirection === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return 0;
      });
    }

    // Nur die Anzahl der angezeigten Einträge limitieren
    setFilteredData(sortedAndFilteredData.slice(0, itemsPerPage));
  }, [filters, data, searchQuery, startDate, endDate, sortColumn, sortDirection, itemsPerPage]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  const columns = [
    { key: "status", type: "text", label: "Status" },
    { key: "type", type: "text", label: "Type" },
    { key: "nsapp", type: "text", label: "Application" },
    { key: "os_type", type: "text", label: "OS" },
    { key: "disk_size", type: "number", label: "HDD Size" },
    { key: "core_count", type: "number", label: "Cores" },
    { key: "ram_size", type: "number", label: "RAM" },
    { key: "method", type: "text", label: "Method" },
    { key: "pve_version", type: "text", label: "PVE Version" },
    { key: "error", type: "text", label: "Error" },
    { key: "created_at", type: "text", label: "Created At" }
  ];

  return (
    <div className="p-6 mt-20">
      <h1 className="text-2xl font-bold mb-4 text-center">Created LXCs</h1>

      {/* Search & Date Filters */}
      <div className="mb-4 flex space-x-4">
        <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="p-2 border" />
        <DatePicker selected={startDate} onChange={setStartDate} placeholderText="Start date" className="p-2 border" />
        <DatePicker selected={endDate} onChange={setEndDate} placeholderText="End date" className="p-2 border" />
      </div>


      <ApplicationChart data={filteredData} />
      <br></br>
      {/* Status Legend */}
      <div className="mb-4 flex justify-between items-center">
        <p className="text-lg font-bold">{filteredData.length} results found</p>
        <p className="text-lg font">
          Status Legend: 🔄 installing {installingCounts} | ✔️ completed {doneCounts} | ❌ failed {failedCounts} | ❓ unknown {unknownCounts}
        </p>
      </div>

      {/* Table */}
      <table className="min-w-full table-auto border-collapse">
        <thead>
          <tr>
            {columns.map(({ key, type, label }) => (
              <th key={key} onClick={() => toggleSort(key)} className="cursor-pointer px-4 py-2 border-b text-left">
                <div className="flex items-center space-x-1 flex-row-reverse">
                  {sortColumn === key && renderSortIcon(key)}
                  <span className="font-semibold">{label}</span>
                  <FilterComponent
                    column={key}
                    type={type}
                    activeFilters={filters[key] || []}
                    onApplyFilter={applyFilters}
                    onRemoveFilter={removeFilter}
                    allData={data}
                  />
                </div>
              </th>

            ))}
          </tr>
        </thead>
        {/* Filters Row - Displays below headers */}
        <thead>
          <tr>
            {columns.map(({ key }) => (
              <th key={key} className="px-4 py-2 border-b text-left">
                {filters[key] && filters[key].length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {filters[key].map((filter: { operator: string; value: any }, index: number) => (
                      <div key={`${key}-${filter.value}-${index}`} className="bg-gray-800 text-white px-2 py-1 rounded flex items-center">
                        <span className="text-sm italic">
                          {filter.operator} <b>"{filter.value}"</b>
                        </span>
                        <button className="text-red-500 ml-2" onClick={() => removeFilter(key, index)}>
                          ✖
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-500">—</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredData.length > 0 ? (
            filteredData.slice(0, itemsPerPage).map((item, index) => (
              <tr key={index}>
                <td className="px-4 py-2 border-b">{item.status}</td>
                <td className="px-4 py-2 border-b">{item.type}</td>
                <td className="px-4 py-2 border-b">{item.nsapp}</td>
                <td className="px-4 py-2 border-b">{item.os_type}</td>
                <td className="px-4 py-2 border-b">{item.disk_size}</td>
                <td className="px-4 py-2 border-b">{item.core_count}</td>
                <td className="px-4 py-2 border-b">{item.ram_size}</td>
                <td className="px-4 py-2 border-b">{item.method}</td>
                <td className="px-4 py-2 border-b">{item.pve_version}</td>
                <td className="px-4 py-2 border-b">{item.error}</td>
                <td className="px-4 py-2 border-b">{formatDate(item.created_at)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-4 py-2 text-center text-gray-500">
                No results found
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {itemsPerPage < filteredData.length && (
        <div className="text-center mt-4">
          <button onClick={handleLoadMore} className="px-4 py-2 bg-blue-500 text-white rounded">
            Load more...
          </button>
        </div>
      )}

    </div>
  );
};

export default DataFetcher;
