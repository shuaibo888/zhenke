import { requestApi, type ApiResponse, type TableResponse } from "./apiClient";
export type Perspective = "LOCAL" | "TOURIST" | "HOMETOWNER";
export type EnjoyCategory = "MALL" | "RESTAURANT" | "SCENIC" | "HOTEL";
export interface Place {
  placeId: number;
  provider: string;
  providerPlaceId: string;
  placeName: string;
  placeType?: string;
  address: string;
  province?: string;
  city?: string;
  district?: string;
  provinceCode?: string;
  cityCode?: string;
  districtCode?: string;
  latitude: number;
  longitude: number;
  coordinateSystem: string;
}
export interface PostResource {
  resourceId?: number;
  resourceType: "IMAGE" | "VIDEO";
  resourceUrl: string;
  resourceSort?: number;
}
export interface PostPlaceSelection {
  provider: string;
  providerPlaceId: string;
  name: string;
  type?: string;
  address: string;
  province?: string;
  city?: string;
  district?: string;
  provinceCode?: string;
  cityCode?: string;
  districtCode?: string;
  latitude: number;
  longitude: number;
}
export interface PublishPostBody {
  title: string;
  content: string;
  suggestion?: string;
  perspective: Perspective;
  place: PostPlaceSelection;
  merchantId?: number;
  resources: PostResource[];
}
export interface ZhenkePost {
  postId: number;
  shopUserId: number;
  userName: string;
  nickName?: string;
  avatar?: string;
  title: string;
  content: string;
  suggestion?: string;
  perspective: Perspective;
  placeId: number;
  placeName: string;
  placeAddress: string;
  placeCity?: string;
  placeDistrict?: string;
  placeLatitude: number;
  placeLongitude: number;
  merchantId?: number;
  merchantName?: string;
  publishedAt: string;
  status: string;
  commentCount: number;
  usefulCount: number;
  usefulByMe: boolean;
  resources: PostResource[];
}
export interface PostComment {
  commentId: number;
  postId: number;
  parentCommentId?: number;
  replyToCommentId?: number;
  shopUserId: number;
  userName: string;
  nickName?: string;
  avatar?: string;
  replyToName?: string;
  postAuthor: boolean;
  content: string;
  createTime: string;
}
export interface MerchantOption {
  merchantId: number;
  shopName: string;
}
export interface Banner {
  bannerId: number;
  title: string;
  subtitle?: string;
  imageUrl: string;
  jumpType: "INTERNAL" | "EXTERNAL";
  jumpTarget: string;
  bannerSort: number;
}
export interface ZhenkeEnjoy {
  enjoyId: number;
  category: EnjoyCategory;
  title: string;
  subtitle?: string;
  coverUrl: string;
  content: string;
  highlights?: string;
  placeName?: string;
  placeAddress?: string;
  displaySort: number;
  status: "0" | "1";
  publishedAt?: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}
export interface EnjoyComment {
  commentId: number;
  enjoyId: number;
  parentCommentId?: number;
  replyToCommentId?: number;
  shopUserId: number;
  userName: string;
  nickName?: string;
  avatar?: string;
  replyToName?: string;
  content: string;
  createTime: string;
}
export async function posts(
  zone = "RECOMMEND",
  pageNum = 1,
  pageSize = 12,
  placeId?: number,
) {
  const q = new URLSearchParams({
    zone,
    pageNum: String(pageNum),
    pageSize: String(pageSize),
  });
  if (placeId) q.set("placeId", String(placeId));
  const r = await requestApi<TableResponse<ZhenkePost>>(
    `/shop/zhenke/posts?${q}`,
  );
  return { rows: r.rows ?? [], total: r.total ?? 0 };
}
export async function post(id: number) {
  return (await requestApi<ApiResponse<ZhenkePost>>(`/shop/zhenke/posts/${id}`))
    .data!;
}
export async function mine(pageNum = 1) {
  const r = await requestApi<TableResponse<ZhenkePost>>(
    `/shop/zhenke/posts/me?pageNum=${pageNum}&pageSize=20`,
    {},
    true,
  );
  return { rows: r.rows ?? [], total: r.total ?? 0 };
}
export async function publish(body: PublishPostBody) {
  return (
    await requestApi<ApiResponse<ZhenkePost>>(
      "/shop/zhenke/posts",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      true,
    )
  ).data!;
}
export async function removePost(id: number) {
  await requestApi(`/shop/zhenke/posts/${id}`, { method: "DELETE" }, true);
}
export async function toggleUseful(id: number) {
  return (
    await requestApi<ApiResponse<{ useful: boolean; usefulCount: number }>>(
      `/shop/zhenke/posts/${id}/useful`,
      { method: "POST" },
      true,
    )
  ).data!;
}
export async function comments(id: number) {
  return (
    (
      await requestApi<ApiResponse<PostComment[]>>(
        `/shop/zhenke/posts/${id}/comments`,
      )
    ).data ?? []
  );
}
export async function createComment(
  id: number,
  content: string,
  replyToCommentId?: number,
) {
  return (
    await requestApi<ApiResponse<PostComment>>(
      `/shop/zhenke/posts/${id}/comments`,
      { method: "POST", body: JSON.stringify({ content, replyToCommentId }) },
      true,
    )
  ).data!;
}
export async function deleteComment(id: number, cid: number) {
  await requestApi(
    `/shop/zhenke/posts/${id}/comments/${cid}`,
    {
      method: "DELETE",
    },
    true,
  );
}
export async function upload(file: File) {
  const f = new FormData();
  f.append("file", file);
  return (
    await requestApi<ApiResponse<string>>(
      "/shop/zhenke/resources",
      {
        method: "POST",
        body: f,
      },
      true,
    )
  ).data!;
}
export async function place(id: number) {
  return (await requestApi<ApiResponse<Place>>(`/shop/zhenke/places/${id}`))
    .data!;
}
export async function banners() {
  return (
    (await requestApi<ApiResponse<Banner[]>>("/shop/zhenke/banners")).data ?? []
  );
}

export async function merchantOptions(keyword = "") {
  const data = (
    await requestApi<ApiResponse<Array<MerchantOption | null>>>(
      `/shop/zhenke/merchant-options?keyword=${encodeURIComponent(keyword)}`,
    )
  ).data;
  if (!Array.isArray(data)) return [];
  return data.filter(
    (item): item is MerchantOption =>
      item != null
      && Number.isFinite(item.merchantId)
      && typeof item.shopName === "string"
      && item.shopName.trim().length > 0,
  );
}

export async function enjoys(category?: EnjoyCategory, pageNum = 1, pageSize = 12) {
  const query = new URLSearchParams({ pageNum: String(pageNum), pageSize: String(pageSize) });
  if (category) query.set("category", category);
  const result = await requestApi<TableResponse<ZhenkeEnjoy>>(`/shop/zhenke/enjoys?${query}`);
  return { rows: result.rows ?? [], total: result.total ?? 0 };
}

export async function enjoyDetail(id: number) {
  return (await requestApi<ApiResponse<ZhenkeEnjoy>>(`/shop/zhenke/enjoys/${id}`)).data!;
}

export async function toggleEnjoyLike(id: number) {
  return (
    await requestApi<ApiResponse<{ liked: boolean; likeCount: number }>>(
      `/shop/zhenke/enjoys/${id}/like`,
      { method: "POST" },
      true,
    )
  ).data!;
}

export async function enjoyComments(id: number) {
  return (
    (await requestApi<ApiResponse<EnjoyComment[]>>(`/shop/zhenke/enjoys/${id}/comments`)).data ?? []
  );
}

export async function createEnjoyComment(id: number, content: string, replyToCommentId?: number) {
  return (
    await requestApi<ApiResponse<EnjoyComment>>(
      `/shop/zhenke/enjoys/${id}/comments`,
      { method: "POST", body: JSON.stringify({ content, replyToCommentId }) },
      true,
    )
  ).data!;
}

export async function deleteEnjoyComment(id: number, commentId: number) {
  await requestApi(
    `/shop/zhenke/enjoys/${id}/comments/${commentId}`,
    { method: "DELETE" },
    true,
  );
}
